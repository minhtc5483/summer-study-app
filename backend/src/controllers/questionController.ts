import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
const getQuestionsSchema = z.object({
  topicId: z.string().optional(),
  level: z.string().regex(/^\d+$/).transform(Number).optional()
});

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const parsed = getQuestionsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, level } = parsed.data;
    const filter: Record<string, string | number> = {};
    if (topicId) filter.topicId = topicId;
    if (level) filter.level = level;

    const questions = await prisma.question.findMany({
      where: filter
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createQuestionSchema = z.object({
  topicId: z.string(),
  type: z.string(),
  content: z.any(),
  level: z.union([z.string().regex(/^\d+$/).transform(Number), z.number()]).optional().default(1),
  points: z.union([z.string().regex(/^\d+$/).transform(Number), z.number()]).optional().default(10)
});

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const parsed = createQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, type, content, level, points } = parsed.data;
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);

    const question = await prisma.question.create({
      data: {
        topicId,
        type,
        content: contentString,
        level,
        points
      }
    });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const importQuestionsSchema = z.object({
  topicId: z.string(),
  questions: z.array(z.object({
    type: z.string(),
    content: z.any(),
    level: z.number().optional().default(1),
    points: z.number().optional().default(10)
  }))
});

export const importQuestions = async (req: Request, res: Response) => {
  try {
    const parsed = importQuestionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, questions } = parsed.data;

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return res.status(404).json({ error: 'Không tìm thấy chủ đề để nhập câu hỏi.' });
    }

    const contentOf = (q: { content: any }) =>
      typeof q.content === 'string' ? q.content : JSON.stringify(q.content);
    const textOf = (content: string) => {
      try {
        return String(JSON.parse(content).text ?? '').trim().toLowerCase();
      } catch {
        return content.trim().toLowerCase();
      }
    };

    // Re-importing the same file is the normal way people retry a failed import, so silently
    // creating a second copy of every question is worse than useless. Match on the question
    // text (the content JSON also carries option order, which differs harmlessly).
    const existing = await prisma.question.findMany({ where: { topicId }, select: { content: true } });
    const seen = new Set(existing.map((q) => textOf(q.content)));

    const data: { topicId: string; type: string; content: string; level: number; points: number }[] = [];
    let duplicates = 0;
    for (const q of questions) {
      const content = contentOf(q);
      const key = textOf(content);
      if (!key || seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      data.push({ topicId, type: q.type, content, level: q.level, points: q.points });
    }

    const result = data.length > 0 ? await prisma.question.createMany({ data }) : { count: 0 };
    res.json({ message: 'Import successful', count: result.count, duplicates });
  } catch (error) {
    console.error('Import questions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Vision/OCR stays on the full flash model — reading a scanned worksheet is harder than
// writing questions from scratch, and this runs once per upload. The responseSchema is what
// keeps it fast enough for the tunnel's 100s budget (and removes the old strip-the-```json
// -fences-and-hope parsing).
const importedQuestionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ['MULTIPLE_CHOICE', 'FILL_BLANK'] },
      level: { type: Type.INTEGER },
      points: { type: Type.INTEGER },
      text: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correct: { type: Type.STRING },
    },
    required: ['type', 'level', 'points', 'text', 'correct'],
  },
};

interface ImportedQuestion {
  type: string;
  level: number;
  points: number;
  text: string;
  options?: string[];
  correct: string;
}

export const importPDF = async (req: Request, res: Response) => {
  const file = req.file;
  try {
    const { topicId } = req.body;

    if (!file || !topicId) {
      return res.status(400).json({ error: 'Thiếu file hoặc chủ đề.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên server.' });
    }

    const base64Data = fs.readFileSync(file.path).toString('base64');

    const prompt = `Bạn là một trợ lý giáo dục AI. Hãy đọc nội dung trong hình ảnh hoặc tài liệu PDF được cung cấp (bài tập cho trẻ tiểu học Việt Nam) và trích xuất tất cả các câu hỏi.

Quy tắc:
1. Câu trắc nghiệm: type = "MULTIPLE_CHOICE", điền mảng "options" chứa các lựa chọn, và "correct" phải trùng khớp hoàn toàn với một chuỗi trong "options" (không ghi A, B, C, D).
2. Câu tự luận / đặt tính rồi tính: type = "FILL_BLANK", bỏ trống "options", "correct" chỉ chứa kết quả cuối cùng (ví dụ: "45", "15 cm").
3. "level" là 1 (dễ), 2 (trung bình) hoặc 3 (khó). "points" thường là 10.
4. Giữ nguyên tiếng Việt có dấu như trong tài liệu.`;

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: file.mimetype, data: base64Data } }] }],
      config: { responseMimeType: 'application/json', responseSchema: importedQuestionSchema },
    });

    let questionsParsed: ImportedQuestion[];
    try {
      questionsParsed = JSON.parse(result.text ?? '');
    } catch {
      console.error('Failed to parse AI response:', result.text);
      return res.status(400).json({ error: 'AI trả về dữ liệu không đúng định dạng. Bạn thử chụp rõ hơn rồi tải lại nhé.' });
    }

    // Bỏ những câu AI đọc được một nửa: trắc nghiệm mà đáp án đúng không nằm trong các lựa chọn
    // thì bé sẽ không bao giờ trả lời đúng được, thà bỏ còn hơn đưa vào kho.
    const valid = (questionsParsed || []).filter((q) => {
      if (!q?.text || !q.correct) return false;
      if (q.type === 'MULTIPLE_CHOICE') {
        return Array.isArray(q.options) && q.options.length >= 2 && q.options.includes(q.correct);
      }
      return true;
    });

    if (valid.length === 0) {
      return res.status(400).json({ error: 'AI không đọc được câu hỏi nào từ file này. Bạn thử chụp rõ hơn hoặc dùng file CSV nhé.' });
    }

    const data = valid.map((q) => ({
      topicId,
      type: q.type === 'FILL_BLANK' ? 'FILL_BLANK' : 'MULTIPLE_CHOICE',
      content: JSON.stringify(
        q.type === 'FILL_BLANK'
          ? { text: q.text, correct: q.correct }
          : { text: q.text, options: q.options, correct: q.correct }
      ),
      level: q.level >= 1 && q.level <= 3 ? q.level : 1,
      points: q.points > 0 ? q.points : 10,
    }));

    const createResult = await prisma.question.createMany({ data });

    res.json({ message: 'Import successful', count: createResult.count, skipped: questionsParsed.length - valid.length });
  } catch (error: any) {
    console.error('Import PDF Error:', error);
    const status = error?.status;
    if (status === 429) {
      return res.status(429).json({ error: 'Đã dùng hết hạn mức AI miễn phí của Google cho hôm nay. Bạn thử lại vào ngày mai, hoặc dùng file CSV nhé.' });
    }
    if (status === 503) {
      return res.status(503).json({ error: 'AI của Google đang quá tải. Vui lòng thử lại sau vài phút nhé.' });
    }
    res.status(500).json({ error: 'Có lỗi khi AI đọc file. Vui lòng thử lại.' });
  } finally {
    // Uploaded scans piled up in uploads/ whenever the old code threw before its unlink.
    if (file?.path) {
      fs.promises.unlink(file.path).catch(() => {});
    }
  }
};
