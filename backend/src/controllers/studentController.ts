import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = String(req.user!.id);
    const students = await prisma.student.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const studentSchema = z.object({
  name: z.string().min(1),
  grade: z.string().regex(/^\d+$/).transform(Number),
});

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    const parsed = studentSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { name, grade } = parsed.data;
    const avatar = req.file ? `/uploads/${req.file.filename}` : null;

    const student = await prisma.student.create({
      data: {
        parentId,
        name,
        grade,
        avatar,
      }
    });

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    const { id } = req.params;
    
    const parsed = studentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { name, grade } = parsed.data;

    // Verify ownership
    const student = await prisma.student.findUnique({ where: { id: id as string } });
    if (!student || student.parentId !== parentId) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const dataToUpdate: Record<string, string | number> = { name, grade };
    if (req.file) {
      dataToUpdate.avatar = `/uploads/${req.file.filename}`;
    }

    const updatedStudent = await prisma.student.update({
      where: { id: id as string },
      data: dataToUpdate
    });

    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { id: id as string } });
    if (!student || student.parentId !== parentId) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.student.delete({ where: { id: id as string } });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
