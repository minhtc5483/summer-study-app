import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '../index';

// gemini-flash-latest with a free-form prompt took ~42s to write 30 questions, which is
// long enough to trip Cloudflare Tunnel's 100s origin timeout once a retry is involved.
// flash-lite with a responseSchema does the same job in ~4-6s and returns guaranteed-valid
// JSON, so the old "find the first [...] with a regex" salvage step is gone too.
const MODEL = 'gemini-flash-lite-latest';

const questionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      level: { type: Type.INTEGER },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correct: { type: Type.STRING },
    },
    required: ['text', 'level', 'options', 'correct'],
  },
};

const idSchema = { type: Type.ARRAY, items: { type: Type.STRING } };

interface GeneratedQuestion {
  text: string;
  level: number;
  options: string[];
  correct: string;
}

// Gemini occasionally returns 503 "high demand" errors that are transient by Google's own
// description — retrying after a short delay usually succeeds. 429 is NOT retried here: on
// the free tier it means the daily quota is gone, and hammering it just burns the remaining
// window while the parent waits (see toParentFacingError for the message they get instead).
function isRetryableAiError(err: any): boolean {
  const status = err?.status ?? err?.response?.status;
  const message = String(err?.message || '');
  return status === 503 || /\b503\b|overloaded|high demand|service unavailable/i.test(message);
}

function isQuotaError(err: any): boolean {
  const status = err?.status ?? err?.response?.status;
  const message = String(err?.message || '');
  return status === 429 || /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(message);
}

// Turns whatever Gemini threw into something a parent can act on. Anything already written
// in Vietnamese by our own code is passed through untouched.
export function toParentFacingError(err: any): Error {
  if (isQuotaError(err)) {
    return new Error(
      'Đã dùng hết hạn mức AI miễn phí của Google cho hôm nay. Bạn thử lại vào ngày mai, hoặc tạo đề thủ công từ Kho Bài Tập nhé.'
    );
  }
  if (isRetryableAiError(err)) {
    return new Error('AI của Google đang quá tải. Vui lòng thử lại sau vài phút nhé.');
  }
  return new Error(err?.message || 'Có lỗi xảy ra khi tạo đề bằng AI.');
}

export async function generateJson<T>(prompt: string, responseSchema: any, retries = 3): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên server.');
  }
  const ai = new GoogleGenAI({ apiKey });

  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema },
      });
      return JSON.parse(result.text ?? '') as T;
    } catch (err: any) {
      lastError = err;
      if (!isRetryableAiError(err) || attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
  throw lastError;
}

export async function generateAiExam(
  subjectId: string,
  studentIds: string[],
  numberOfQuestions: number,
  timeLimit?: number | null,
  dueDate?: Date | null,
  targetTopicId?: string | null,
  // Historically called "tìm kiếm Internet", but the request never enabled Google Search
  // grounding — and the free-tier API key can't: enabling it returns 429 immediately. What
  // this flag actually does, and always did, is have Gemini WRITE brand-new questions from
  // its own knowledge instead of picking from the existing question bank. The UI label now
  // says so; the name is kept because AiExamSchedule rows persist it.
  writeNewQuestions?: boolean,
  difficulty?: number
) {
  // Lấy tất cả câu hỏi thuộc môn học (hoặc cụ thể một topic)
  const filter: any = { subjectId };
  if (targetTopicId) {
    filter.id = targetTopicId;
  }

  const topics = await prisma.topic.findMany({
    where: filter,
    include: { questions: { select: { id: true, level: true, type: true } } },
  });

  let allQuestions: any[] = [];
  topics.forEach((t) => {
    allQuestions = allQuestions.concat(t.questions.map((q) => ({ ...q, topicName: t.name, topicId: t.id })));
  });

  if (!writeNewQuestions && allQuestions.length < numberOfQuestions) {
    throw new Error(
      `Kho bài tập chỉ có ${allQuestions.length} câu, không đủ để tạo đề ${numberOfQuestions} câu. Hãy nhập thêm câu hỏi (nút "Nhập CSV") hoặc bật "Để AI soạn câu hỏi mới".`
    );
  }

  let selectedIds: string[] = [];

  if (writeNewQuestions) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    const topicName = targetTopicId ? topics.find((t) => t.id === targetTopicId)?.name : 'tổng hợp';
    const diffString = difficulty === 3 ? 'Khó' : difficulty === 2 ? 'Trung bình' : 'Dễ';

    const prompt = `Bạn là một chuyên gia giáo dục tiểu học Việt Nam. Hãy soạn đúng ${numberOfQuestions} câu hỏi trắc nghiệm môn ${subject?.name}, chủ đề ${topicName}, bám sát chương trình sách giáo khoa hiện hành.
Yêu cầu mức độ: ${difficulty ? diffString : 'đa dạng (mức 1 dễ, mức 2 trung bình, mức 3 khó)'}.
Mỗi câu có đúng 4 lựa chọn khác nhau, và trường "correct" phải trùng khớp hoàn toàn với một trong 4 lựa chọn đó.
Trường "level" là số 1, 2 hoặc 3.`;

    let newQuestions: GeneratedQuestion[];
    try {
      newQuestions = await generateJson<GeneratedQuestion[]>(prompt, questionSchema);
    } catch (err) {
      console.error('Gemini Quick Create Error:', err);
      throw toParentFacingError(err);
    }

    // Chỉ giữ những câu hợp lệ: đáp án đúng phải nằm trong danh sách lựa chọn.
    const valid = (newQuestions || []).filter(
      (q) => q && q.text && Array.isArray(q.options) && q.options.length >= 2 && q.options.includes(q.correct)
    );
    if (valid.length === 0) {
      throw new Error('AI không tạo được câu hỏi hợp lệ nào. Vui lòng thử lại.');
    }

    const finalTopicId = targetTopicId || topics[0]?.id;
    if (!finalTopicId) throw new Error('Không có chủ đề nào để lưu câu hỏi.');

    // Creating each Question is a separate write, and there's a real Exam.create() after
    // them that can still fail (bad studentIds, a race on the topic being deleted, ...) —
    // without a transaction that left the just-written questions behind with no exam
    // pointing at them. Wrapping both in one transaction means either the whole "N new
    // questions + the exam that uses them" lands, or none of it does.
    return prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        valid.slice(0, numberOfQuestions).map((q) =>
          tx.question.create({
            data: {
              topicId: finalTopicId,
              content: JSON.stringify({ text: q.text, options: q.options, correct: q.correct }),
              level: q.level >= 1 && q.level <= 3 ? q.level : 1,
              type: 'MULTIPLE_CHOICE',
            },
          })
        )
      );

      return tx.exam.create({
        data: {
          topicId: finalTopicId,
          name: `Đề Thi Nhanh AI - ${new Date().toLocaleDateString('vi-VN')}`,
          timeLimit: timeLimit || 15,
          dueDate: dueDate,
          questions: { create: created.map((c) => ({ questionId: c.id })) },
          students: { connect: studentIds.map((id) => ({ id })) },
        },
        include: { questions: true, students: true, topic: true },
      });
    });
  } else {
    const filteredQuestions = difficulty ? allQuestions.filter((q) => q.level === difficulty) : allQuestions;
    const pool = filteredQuestions.length >= numberOfQuestions ? filteredQuestions : allQuestions;

    try {
      const questionInfo = pool.map((q, idx) => `[${idx}] ID: ${q.id} | Chủ đề: ${q.topicName} | Mức độ: ${q.level}`).join('\n');
      const prompt = `Bạn là một chuyên gia giáo dục AI. Hãy chọn ra đúng ${numberOfQuestions} câu hỏi từ danh sách dưới đây để tạo thành một đề thi cân bằng, đa dạng chủ đề và độ khó phù hợp.

Danh sách câu hỏi:
${questionInfo}

Trả về mảng ID của các câu hỏi bạn đã chọn.`;

      const ids = await generateJson<string[]>(prompt, idSchema);
      selectedIds = (ids || []).filter((id) => pool.some((q) => q.id === id));
    } catch (err) {
      // Chọn câu từ kho là việc AI làm cho "đẹp" chứ không bắt buộc — hết hạn mức hay quá
      // tải thì bốc ngẫu nhiên vẫn ra được đề, không cần làm phiền phụ huynh.
      console.error('Gemini selection failed, falling back to random:', err);
    }

    if (selectedIds.length < numberOfQuestions) {
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      selectedIds = shuffled.slice(0, numberOfQuestions).map((q) => q.id);
    }
  }

  // Chọn topic đại diện (lấy topic có nhiều câu hỏi được chọn nhất)
  const topicCount: Record<string, number> = {};
  allQuestions
    .filter((q) => selectedIds.includes(q.id))
    .forEach((q) => {
      topicCount[q.topicId] = (topicCount[q.topicId] || 0) + 1;
    });
  const mainTopicId = Object.keys(topicCount).sort((a, b) => (topicCount[b] || 0) - (topicCount[a] || 0))[0];
  const finalTopicId = targetTopicId || mainTopicId || topics[0]?.id;

  if (!finalTopicId) {
    throw new Error('Không tìm thấy chủ đề nào cho môn học này.');
  }

  const exam = await prisma.exam.create({
    data: {
      topicId: finalTopicId,
      name: `Đề Thi Nhanh AI - ${new Date().toLocaleDateString('vi-VN')}`,
      timeLimit: timeLimit || 15,
      dueDate: dueDate,
      questions: {
        create: selectedIds.map((qId) => ({ questionId: qId })),
      },
      students: {
        connect: studentIds.map((id) => ({ id })),
      },
    },
    include: {
      questions: true,
      students: true,
      topic: true,
    },
  });

  return exam;
}

const topicSuggestionSchema = { type: Type.ARRAY, items: { type: Type.STRING } };

// Suggests curriculum-aligned topic names for a subject+grade, so a parent picking "Chủ đề
// tập trung" in Tạo Đề Nhanh AI has real ideas to choose from instead of a free-text box or
// an empty dropdown when nothing's been added yet. Returns plain names — the caller decides
// whether each one matches an existing Topic or needs to be created.
export async function suggestTopicNames(
  subjectName: string,
  grade: string,
  existingNames: string[]
): Promise<string[]> {
  const avoidList = existingNames.length > 0 ? existingNames.join(', ') : 'chưa có chủ đề nào';
  const prompt = `Bạn là một chuyên gia giáo dục tiểu học Việt Nam. Hãy liệt kê 6 chủ đề học tập tiêu biểu, bám sát chương trình sách giáo khoa hiện hành (GDPT 2018), cho môn ${subjectName} dành cho học sinh ${grade}.
Mỗi chủ đề là một cụm từ ngắn gọn, dưới 6 từ, đúng thuật ngữ dùng trong sách giáo khoa (ví dụ: "Phép cộng phạm vi 20", "So sánh phân số", "Đọc hiểu đoạn văn ngắn").
KHÔNG được lặp lại các chủ đề đã có sẵn sau đây: ${avoidList}.`;

  const names = await generateJson<string[]>(prompt, topicSuggestionSchema);

  // Bộ lọc an toàn ở phía server: dù đã dặn trong prompt, vẫn có thể AI lặp lại tên đã có.
  const existingLower = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of names || []) {
    const name = String(raw || '').trim();
    const key = name.toLowerCase();
    if (!name || key.length > 60 || existingLower.has(key) || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(name);
  }
  return cleaned.slice(0, 8);
}
