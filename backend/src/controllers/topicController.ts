import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

const getTopicsSchema = z.object({
  subjectId: z.string().optional(),
  grade: z.string().regex(/^\d+$/).transform(Number).optional()
});

export const getTopics = async (req: Request, res: Response) => {
  try {
    const parsed = getTopicsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { subjectId, grade } = parsed.data;
    const filter: Record<string, string | number> = {};
    if (subjectId) filter.subjectId = subjectId;
    if (grade) filter.grade = grade;

    const topics = await prisma.topic.findMany({
      where: filter,
      include: { subject: true }
    });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createTopicSchema = z.object({
  subjectId: z.string(),
  name: z.string().min(1),
  grade: z.string(),
  description: z.string().optional()
});

export const createTopic = async (req: Request, res: Response) => {
  try {
    const parsed = createTopicSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { subjectId, name, grade, description } = parsed.data;
    const topic = await prisma.topic.create({
      data: {
        subjectId,
        name,
        grade,
        description: description || null
      }
    });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
