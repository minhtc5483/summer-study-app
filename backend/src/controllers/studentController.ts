import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

export const getPublicStudents = async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: 'asc' },
      include: { subjects: true }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = String(req.user!.id);
    const students = await prisma.student.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
      include: { subjects: true }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const studentSchema = z.object({
  name: z.string().min(1),
  grade: z.string(),
  subjectIds: z.string().optional() // JSON string array of IDs
});

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = studentSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { name, grade, subjectIds } = parsed.data;
    const parentId = req.user!.id;
    let avatarUrl = null;

    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    let subjectsConnect: { id: string }[] = [];
    if (subjectIds) {
      try {
        const ids = JSON.parse(subjectIds);
        if (Array.isArray(ids)) {
          subjectsConnect = ids.map((id: string) => ({ id }));
        }
      } catch (e) {}
    }

    const student = await prisma.student.create({
      data: {
        parentId,
        name,
        grade,
        avatar: avatarUrl,
        subjects: {
          connect: subjectsConnect
        }
      },
      include: { subjects: true }
    });

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const parsed = studentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { name, grade, subjectIds } = parsed.data;
    let avatarUrl = undefined;

    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    let subjectsSet: { id: string }[] | undefined = undefined;
    if (subjectIds) {
      try {
        const ids = JSON.parse(subjectIds);
        if (Array.isArray(ids)) {
          subjectsSet = ids.map((sId: string) => ({ id: sId }));
        }
      } catch (e) {}
    }

    const student = await prisma.student.update({
      where: { id: id as string, parentId: req.user!.id },
      data: {
        name,
        grade,
        ...(avatarUrl && { avatar: avatarUrl }),
        ...(subjectsSet !== undefined && { subjects: { set: subjectsSet } })
      },
      include: { subjects: true }
    });

    res.json(student);
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
