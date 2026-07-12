import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

export async function generateAiExam(
  subjectId: string, 
  studentIds: string[], 
  numberOfQuestions: number, 
  timeLimit?: number | null, 
  dueDate?: Date | null,
  targetTopicId?: string | null
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

  if (allQuestions.length < numberOfQuestions) {
    throw new Error(`Kho bài tập chỉ có ${allQuestions.length} câu, không đủ để tạo đề ${numberOfQuestions} câu.`);
  }

  let selectedIds: string[] = [];
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const questionInfo = allQuestions.map((q, idx) => `[${idx}] ID: ${q.id} | Chủ đề: ${q.topicName} | Mức độ: ${q.level}`).join('\n');
      
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
    } catch (err) {
      console.error("Gemini Quick Create Error:", err);
    }
  }

  // Nếu Gemini lỗi hoặc không đủ câu do hallucination, fallback về random
  if (selectedIds.length < numberOfQuestions) {
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    selectedIds = shuffled.slice(0, numberOfQuestions).map(q => q.id);
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
