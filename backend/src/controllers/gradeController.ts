import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

export const getGrades = async (req: Request, res: Response) => {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createGradeSchema = z.object({
  name: z.string().min(1, 'Tên khối lớp không được để trống'),
});

export const createGrade = async (req: Request, res: Response) => {
  try {
    const parsed = createGradeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const grade = await prisma.grade.create({
      data: { name: parsed.data.name }
    });
    res.json(grade);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteGrade = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.grade.delete({
      where: { id }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
