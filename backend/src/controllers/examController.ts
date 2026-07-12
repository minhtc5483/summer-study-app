import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateAiExam } from '../services/aiExamService';

// POST /exams
const createExamSchema = z.object({
  topicId: z.string(),
  name: z.string(),
  questionIds: z.array(z.string()).min(1),
  studentIds: z.array(z.string()).optional(),
  timeLimit: z.number().int().min(1).optional().nullable(),
  dueDate: z.string().optional().nullable()
});

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createExamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, name, questionIds, studentIds, timeLimit, dueDate } = parsed.data;

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
        dueDate: dueDate ? new Date(dueDate) : null,
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
    const studentId = req.query.studentId as string | undefined;

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

    // Fetch exam result if studentId provided
    let examResult = null;
    if (studentId) {
      examResult = await prisma.examResult.findUnique({
        where: { studentId_examId: { studentId, examId: id } }
      });
    }

    // Transform response so the frontend gets an array of questions easily
    const transformed = {
      ...exam,
      questionsList: exam.questions.map((eq: any) => eq.question),
      examResult
    };

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateExamSchema = z.object({
  studentIds: z.array(z.string()).optional(),
  name: z.string().optional(),
  timeLimit: z.number().int().min(1).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  questionIds: z.array(z.string()).min(1).optional()
});

export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateExamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { studentIds, name, timeLimit, dueDate, questionIds } = parsed.data;

    let updateData: any = {};
    if (studentIds) {
      updateData.students = { set: studentIds.map(sId => ({ id: sId })) };
    }
    if (name) updateData.name = name;
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    
    // Nếu có questionIds, thì xóa cũ và tạo mới
    if (questionIds) {
      // Đầu tiên phải update Exam bằng cách delete các question cũ, sau đó create mới
      // Prisma có nested writes cho relation:
      updateData.questions = {
        deleteMany: {}, // Xóa toàn bộ liên kết ExamQuestion cũ
        create: questionIds.map(qId => ({ questionId: qId }))
      };
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: updateData,
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
  topicId: z.string().optional().nullable(),
  studentIds: z.array(z.string()),
  numberOfQuestions: z.number().int().min(1).max(50),
  timeLimit: z.number().int().min(1).optional(),
  dueDate: z.string().optional().nullable(),
  useInternetSearch: z.boolean().optional()
});

export const quickCreateExam = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = quickCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { subjectId, topicId, studentIds, numberOfQuestions, timeLimit, dueDate, useInternetSearch } = parsed.data;

    const exam = await generateAiExam(
      subjectId,
      studentIds,
      numberOfQuestions,
      timeLimit,
      dueDate ? new Date(dueDate) : null,
      topicId,
      useInternetSearch
    );

    res.status(201).json(exam);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
};

