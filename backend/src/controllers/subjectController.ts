import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: { topics: true }
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const subjectSchema = z.object({
  name: z.string().min(1, 'Tên môn học không được để trống'),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export const createSubject = async (req: Request, res: Response) => {
  try {
    const parsed = subjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { name, icon, color } = parsed.data;
    const subject = await prisma.subject.create({
      data: { name, icon, color }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateSubjectSchema = subjectSchema.partial();

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const parsed = updateSubjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const id = req.params.id as string;
    const { name, icon, color } = parsed.data;
    const subject = await prisma.subject.update({
      where: { id },
      data: { name, icon, color }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.subject.delete({
      where: { id }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
