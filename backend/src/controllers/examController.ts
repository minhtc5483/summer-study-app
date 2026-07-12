import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

// POST /exams
const createExamSchema = z.object({
  topicId: z.string(),
  name: z.string(),
  questionIds: z.array(z.string()).min(1),
  studentIds: z.array(z.string()).optional(),
  timeLimit: z.number().int().min(1).optional().nullable()
});

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createExamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, name, questionIds, studentIds, timeLimit } = parsed.data;

    let studentsConnect: any = undefined;
    if (studentIds && studentIds.length > 0) {
      studentsConnect = {
        connect: studentIds.map(id => ({ id }))
      };
    }

    const exam = await prisma.exam.create({
      data: {
        topicId,
        name,
        timeLimit,
        questions: {
          create: questionIds.map(qId => ({ questionId: qId }))
        },
        ...(studentsConnect && { students: studentsConnect })
      },
      include: {
        questions: true,
        students: true
      }
    });

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /exams?subjectId=... or /exams?topicId=... or /exams?studentId=...
export const getExams = async (req: Request, res: Response) => {
  try {
    const subjectId = req.query.subjectId as string | undefined;
    const topicId = req.query.topicId as string | undefined;
    const studentId = req.query.studentId as string | undefined;

    let filter: any = {};
    if (topicId) {
      filter.topicId = topicId;
    } else if (subjectId) {
      filter.topic = { subjectId: subjectId };
    }
    
    if (studentId) {
      filter.students = { some: { id: studentId } };
    }

    const exams = await prisma.exam.findMany({
      where: filter,
      include: {
        topic: true,
        students: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: { questions: true }
        },
        examResults: studentId ? { where: { studentId } } : false
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /exams/:id
export const getExamById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        topic: true,
        questions: {
          include: {
            question: true
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Transform response so the frontend gets an array of questions easily
    const transformed = {
      ...exam,
      questionsList: exam.questions.map((eq: any) => eq.question)
    };

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateExamSchema = z.object({
  studentIds: z.array(z.string())
});

export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateExamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { studentIds } = parsed.data;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        students: {
          set: studentIds.map(sId => ({ id: sId }))
        }
      },
      include: {
        students: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteExam = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.exam.delete({
      where: { id }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const quickCreateSchema = z.object({
  subjectId: z.string(),
  studentIds: z.array(z.string()),
  numberOfQuestions: z.number().int().min(1).max(50),
  timeLimit: z.number().int().min(1).optional()
});

export const quickCreateExam = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = quickCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { subjectId, studentIds, numberOfQuestions, timeLimit } = parsed.data;

    // Lấy tất cả câu hỏi thuộc môn học này
    const topics = await prisma.topic.findMany({
      where: { subjectId },
      include: { questions: { select: { id: true, level: true, type: true } } }
    });

    let allQuestions: any[] = [];
    topics.forEach(t => {
      allQuestions = allQuestions.concat(t.questions.map(q => ({ ...q, topicName: t.name, topicId: t.id })));
    });

    if (allQuestions.length < numberOfQuestions) {
      return res.status(400).json({ error: `Kho bài tập chỉ có ${allQuestions.length} câu, không đủ để tạo đề ${numberOfQuestions} câu.` });
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
    const finalTopicId = mainTopicId || topics[0]?.id;

    if (!finalTopicId) {
      return res.status(400).json({ error: 'Không tìm thấy chủ đề nào cho môn học này.' });
    }

    const exam = await prisma.exam.create({
      data: {
        topicId: finalTopicId,
        name: `Đề Thi Nhanh AI - ${new Date().toLocaleDateString('vi-VN')}`,
        timeLimit: timeLimit || 15,
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

    res.json(exam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
