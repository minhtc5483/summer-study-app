import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

const getExamSchema = z.object({
  subjectId: z.string().optional(),
  level: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10)
});

export const getExam = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = getExamSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { subjectId, level, limit } = parsed.data;

    let topics = await prisma.topic.findMany();
    if (subjectId) {
      topics = topics.filter(t => t.subjectId === subjectId);
    }
    const topicIds = topics.map(t => t.id);

    const filter: Record<string, any> = {};
    if (topicIds.length > 0) {
      filter.topicId = { in: topicIds };
    }
    if (level) {
      filter.level = level;
    }

    // SQLite doesn't natively support easy random sampling in Prisma without raw queries.
    // For MVP, fetch a reasonable amount and randomize in memory.
    const allMatching = await prisma.question.findMany({
      where: filter,
      take: 100 // Fetch up to 100 matching to shuffle
    });

    const shuffled = allMatching.sort(() => 0.5 - Math.random());
    const examQuestions = shuffled.slice(0, limit);

    res.json(examQuestions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
