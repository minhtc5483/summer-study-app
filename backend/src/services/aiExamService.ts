import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

export async function generateAiExam(
  subjectId: string, 
  studentIds: string[], 
  numberOfQuestions: number, 
  timeLimit?: number | null, 
  dueDate?: Date | null,
  targetTopicId?: string | null,
  useInternetSearch?: boolean,
  difficulty?: number
) {
  // Lấy tất cả câu hỏi thuộc môn học (hoặc cụ thể một topic)
  let filter: any = { subjectId };
  if (targetTopicId) {
    filter.id = targetTopicId;
  }
  
  const topics = await prisma.topic.findMany({
    where: filter,
    include: { questions: { select: { id: true, level: true, type: true } } }
  });

  let allQuestions: any[] = [];
  topics.forEach(t => {
    allQuestions = allQuestions.concat(t.questions.map(q => ({ ...q, topicName: t.name, topicId: t.id })));
  });

  if (!useInternetSearch && allQuestions.length < numberOfQuestions) {
    throw new Error(`Kho bài tập chỉ có ${allQuestions.length} câu, không đủ để tạo đề ${numberOfQuestions} câu.`);
  }

  let selectedIds: string[] = [];
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey && useInternetSearch) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên server. Không thể tìm kiếm Internet.');
  }

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      
      if (useInternetSearch) {
        // Sinh câu hỏi mới hoàn toàn bằng cách lấy kiến thức từ internet
        const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
        const topicName = targetTopicId ? topics.find(t => t.id === targetTopicId)?.name : 'tổng hợp';
        
        const diffString = difficulty === 3 ? "Khó" : difficulty === 2 ? "Trung bình" : "Dễ";
        const prompt = `Bạn là một chuyên gia giáo dục. Hãy tìm kiếm trên internet các dạng bài tập mới nhất, chuẩn nhất theo sách giáo khoa để tạo ra đúng ${numberOfQuestions} câu hỏi trắc nghiệm môn ${subject?.name}, chủ đề ${topicName}.
        Yêu cầu mức độ: ${difficulty ? diffString : 'Đa dạng mức độ (Dễ, Trung bình, Khó)'}.
        BẮT BUỘC trả về mảng JSON chứa đủ ${numberOfQuestions} câu hỏi. KHÔNG ĐƯỢC trả về mảng rỗng.
        Trả về DUY NHẤT một mảng JSON các object câu hỏi theo định dạng:
        [{
          "text": "Nội dung câu hỏi",
          "level": ${difficulty ? difficulty : '1, 2 hoặc 3'},
          "type": "MULTIPLE_CHOICE",
          "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
          "correct": "Đáp án đúng (phải khớp hoàn toàn với một trong các lựa chọn trong mảng options)"
        }]`;
        
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        // Trích xuất JSON bằng regex để loại bỏ văn bản rác xung quanh
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error("Không thể trích xuất mảng JSON từ kết quả của AI: " + responseText);
        }
        
        const newQuestions = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(newQuestions) || newQuestions.length === 0) {
           throw new Error("AI trả về mảng câu hỏi rỗng hoặc không hợp lệ: " + responseText);
        }

        // Lưu vào DB
        const savedQuestions = [];
        const finalTopicId = targetTopicId || topics[0]?.id;
        if (!finalTopicId) throw new Error('Không có chủ đề nào để lưu câu hỏi');
        
        for (const q of newQuestions) {
          const contentObj = {
            text: q.text,
            options: q.options,
            correct: q.correct
          };
          
          const created = await prisma.question.create({
            data: {
              topicId: finalTopicId,
              content: JSON.stringify(contentObj),
              level: q.level || 1,
              type: q.type || 'MULTIPLE_CHOICE'
            }
          });
          savedQuestions.push(created.id);
        }
        selectedIds = savedQuestions;
      } else {
        const filteredQuestions = difficulty ? allQuestions.filter(q => q.level === difficulty) : allQuestions;
        if (filteredQuestions.length < numberOfQuestions) {
           console.warn("Không đủ câu hỏi ở độ khó này, dùng toàn bộ kho câu hỏi");
        }
        const pool = filteredQuestions.length >= numberOfQuestions ? filteredQuestions : allQuestions;
        
        const questionInfo = pool.map((q, idx) => `[${idx}] ID: ${q.id} | Chủ đề: ${q.topicName} | Mức độ: ${q.level}`).join('\n');
        
        const prompt = `Bạn là một chuyên gia giáo dục AI. Hãy chọn ra đúng ${numberOfQuestions} câu hỏi từ danh sách dưới đây để tạo thành một đề thi cân bằng, đa dạng chủ đề và độ khó phù hợp.
        
  Danh sách câu hỏi:
  ${questionInfo}
  
  Chỉ trả về MỘT mảng JSON hợp lệ chứa CHÍNH XÁC ${numberOfQuestions} ID của các câu hỏi bạn đã chọn. Không trả về bất cứ chữ nào khác.
  Ví dụ: ["id1", "id2", "id3"]`;
  
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        
        selectedIds = JSON.parse(responseText);
        
        // Cần đảm bảo selectedIds là mảng string và nằm trong allQuestions
        selectedIds = selectedIds.filter(id => allQuestions.some(q => q.id === id));
      }
    } catch (err: any) {
      console.error("Gemini Quick Create Error:", err);
      if (useInternetSearch) {
        throw new Error(err.message || 'Lỗi khi tạo đề từ Internet');
      }
    }
  }

  // Nếu Gemini lỗi hoặc không đủ câu do hallucination, fallback về random
  if (!useInternetSearch && selectedIds.length < numberOfQuestions) {
    const pool = difficulty ? allQuestions.filter(q => q.level === difficulty) : allQuestions;
    const fallbackPool = pool.length >= numberOfQuestions ? pool : allQuestions;
    const shuffled = [...fallbackPool].sort(() => 0.5 - Math.random());
    selectedIds = shuffled.slice(0, numberOfQuestions).map(q => q.id);
  }

  if (useInternetSearch && selectedIds.length === 0) {
    throw new Error('Đã có lỗi xảy ra: AI không thể tạo được câu hỏi nào. Vui lòng thử lại.');
  }

  // Chọn topic đại diện (lấy topic có nhiều câu hỏi được chọn nhất)
  const topicCount: Record<string, number> = {};
  allQuestions.filter(q => selectedIds.includes(q.id)).forEach(q => {
    topicCount[q.topicId] = (topicCount[q.topicId] || 0) + 1;
  });
  const mainTopicId = Object.keys(topicCount).sort((a,b) => (topicCount[b] || 0) - (topicCount[a] || 0))[0];
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
        create: selectedIds.map(qId => ({ questionId: qId }))
      },
      students: {
        connect: studentIds.map(id => ({ id }))
      }
    },
    include: {
      questions: true,
      students: true,
      topic: true
    }
  });

  return exam;
}
