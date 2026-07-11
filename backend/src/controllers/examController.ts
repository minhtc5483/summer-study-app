import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

// POST /exams
const createExamSchema = z.object({
  topicId: z.string(),
  name: z.string(),
  questionIds: z.array(z.string()).min(1)
});

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createExamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, name, questionIds } = parsed.data;

    const exam = await prisma.exam.create({
      data: {
        topicId,
        name,
        questions: {
          create: questionIds.map(qId => ({ questionId: qId }))
        }
      },
      include: {
        questions: true
      }
    });

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /exams?subjectId=... or /exams?topicId=...
export const getExams = async (req: Request, res: Response) => {
  try {
    const subjectId = req.query.subjectId as string | undefined;
    const topicId = req.query.topicId as string | undefined;

    let filter: any = {};
    if (topicId) {
      filter.topicId = topicId;
    } else if (subjectId) {
      filter.topic = { subjectId: subjectId };
    }

    const exams = await prisma.exam.findMany({
      where: filter,
      include: {
        topic: true,
        _count: {
          select: { questions: true }
        }
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
