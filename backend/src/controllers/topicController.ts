import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { suggestTopicNames, toParentFacingError } from '../services/aiExamService';

const getTopicsSchema = z.object({
  subjectId: z.string().optional(),
  grade: z.string().optional()
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

const suggestTopicsSchema = z.object({
  subjectId: z.string(),
  grade: z.string().min(1),
});

export const suggestTopics = async (req: Request, res: Response) => {
  try {
    const parsed = suggestTopicsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }
    const { subjectId, grade } = parsed.data;

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ error: 'Không tìm thấy môn học.' });
    }

    const existingTopics = await prisma.topic.findMany({
      where: { subjectId, grade },
      select: { name: true },
    });

    const suggestions = await suggestTopicNames(
      subject.name,
      grade,
      existingTopics.map((t) => t.name)
    );

    res.json({ suggestions });
  } catch (error: any) {
    console.error('Suggest topics error:', error);
    res.status(500).json({ error: toParentFacingError(error).message });
  }
};
