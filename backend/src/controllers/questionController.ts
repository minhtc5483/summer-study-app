import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

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

    const data = questions.map(q => ({
      topicId,
      type: q.type,
      content: typeof q.content === 'string' ? q.content : JSON.stringify(q.content),
      level: q.level,
      points: q.points
    }));

    const result = await prisma.question.createMany({
      data
    });
    res.json({ message: 'Import successful', count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
