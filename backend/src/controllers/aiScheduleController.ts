import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

// Interfaces for AuthRequest
interface AuthRequest extends Request {
  user?: { id: string; username: string };
}

const createScheduleSchema = z.object({
  subjectId: z.string(),
  topicId: z.string().optional().nullable(),
  studentIds: z.array(z.string()),
  numberOfQuestions: z.number().int().min(1).max(50),
  timeLimit: z.number().int().min(1).optional(),
  dueDays: z.number().int().min(1).optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
  useInternetSearch: z.boolean().optional()
});

export const createAiSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { subjectId, topicId, studentIds, numberOfQuestions, timeLimit, dueDays, difficulty, useInternetSearch } = parsed.data;

    const schedule = await prisma.aiExamSchedule.create({
      data: {
        subjectId,
        topicId,
        studentIds: JSON.stringify(studentIds),
        numberOfQuestions,
        timeLimit,
        dueDays,
        difficulty,
        useInternetSearch
      },
      include: {
        subject: true,
        topic: true
      }
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAiSchedules = async (req: AuthRequest, res: Response) => {
  try {
    const schedules = await prisma.aiExamSchedule.findMany({
      include: {
        subject: true,
        topic: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteAiSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.aiExamSchedule.delete({
      where: { id }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
