import { Request, Response } from 'express';
import { prisma } from '../index';

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

export const createGrade = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const grade = await prisma.grade.create({
      data: { name }
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
