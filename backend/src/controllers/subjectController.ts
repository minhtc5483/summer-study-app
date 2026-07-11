import { Request, Response } from 'express';
import { prisma } from '../index';

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

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, icon, color } = req.body;
    const subject = await prisma.subject.create({
      data: { name, icon, color }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, icon, color } = req.body;
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
