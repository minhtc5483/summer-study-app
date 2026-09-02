import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';
import sharp from 'sharp';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { getEarnedBadges } from './rewardController';

export const getPublicStudents = async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: 'asc' },
      include: { subjects: true }
    });

    // This is the unauthenticated "who's studying" screen — never leak the PIN hash,
    // only whether one is set (frontend uses this to decide whether to prompt for it).
    const studentsWithBadges = students.map(({ pinHash, ...student }) => {
      const earnedBadges = getEarnedBadges(student.totalScore, student.currentStreak);
      return { ...student, hasPin: !!pinHash, earnedBadges };
    });

    res.json(studentsWithBadges);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStudentHistory = async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId as string;

    const [examResults, pointExchanges] = await Promise.all([
      prisma.examResult.findMany({
        where: { studentId },
        include: { 
          exam: {
            include: { questions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.pointExchange.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    const history: any[] = [];
    
    (examResults as any[]).forEach(er => {
      // ExamResult already stores the server-graded counts (see progressController.ts) —
      // use those instead of guessing from the score, which stopped being a clean multiple
      // of 10 per correct answer once questions could carry custom points (CSV import's
      // "Diem" column) and once score started including a variable, accuracy-scaled speed
      // bonus. Falls back to the old estimate only for pre-existing rows saved before those
      // columns existed.
      const totalQuestions = er.questionsAttempted ?? er.exam?.questions?.length ?? 0;
      const correctAnswers = er.questionsCorrect ?? Math.round(er.score / 10);
      history.push({
        id: er.id,
        type: 'EXAM',
        title: er.exam?.name || 'Đề thi',
        score: er.score,
        date: er.createdAt,
        details: `${correctAnswers}/${totalQuestions} câu đúng`,
        timeSpent: er.timeSpent
      });
    });

    pointExchanges.forEach(pe => {
      history.push({
        id: pe.id,
        type: 'EXCHANGE',
        title: `Đổi ${pe.minutes} Phút Chơi`,
        score: -pe.points,
        date: pe.createdAt,
        details: pe.status === 'FULFILLED' ? 'Đã duyệt' : 'Chờ duyệt'
      });
    });

    // Sort by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(history);
  } catch (error) {
    console.error(error);
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

    const studentsWithBadges = students.map(({ pinHash, ...student }) => {
      const earnedBadges = getEarnedBadges(student.totalScore, student.currentStreak);
      return { ...student, hasPin: !!pinHash, earnedBadges };
    });

    res.json(studentsWithBadges);
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
      // multer's fileFilter only checks the client-reported mimetype (trivially spoofable —
      // and express.static later derives the response Content-Type from the saved file's
      // extension, not from what multer thought it was). Previously a non-"image/*" upload
      // fell through to being served completely unprocessed at its own filename/extension —
      // e.g. a file uploaded with a spoofed mimetype but named avatar.svg, containing a
      // <script>, served back with Content-Type: image/svg+xml and executed same-origin
      // (able to read the parent's JWT from localStorage) the moment anyone opened that URL
      // directly. Every avatar must now actually decode as a real raster image and gets
      // re-encoded to .webp — that both rejects anything sharp can't genuinely parse as an
      // image and strips any markup/script a crafted file might have carried, since only the
      // re-encoded pixel data is ever written or served.
      if (!req.file.mimetype.startsWith('image/')) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Ảnh đại diện phải là file ảnh (JPG, PNG, WEBP...).' });
      }
      try {
        const compressedPath = req.file.path + '.webp';
        await sharp(req.file.path)
          .resize(300, 300, { fit: 'cover' })
          .webp({ quality: 75 })
          .toFile(compressedPath);

        fs.unlinkSync(req.file.path);
        avatarUrl = `/uploads/${req.file.filename}.webp`;
      } catch {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'File ảnh không hợp lệ hoặc bị hỏng.' });
      }
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
      // multer's fileFilter only checks the client-reported mimetype (trivially spoofable —
      // and express.static later derives the response Content-Type from the saved file's
      // extension, not from what multer thought it was). Previously a non-"image/*" upload
      // fell through to being served completely unprocessed at its own filename/extension —
      // e.g. a file uploaded with a spoofed mimetype but named avatar.svg, containing a
      // <script>, served back with Content-Type: image/svg+xml and executed same-origin
      // (able to read the parent's JWT from localStorage) the moment anyone opened that URL
      // directly. Every avatar must now actually decode as a real raster image and gets
      // re-encoded to .webp — that both rejects anything sharp can't genuinely parse as an
      // image and strips any markup/script a crafted file might have carried, since only the
      // re-encoded pixel data is ever written or served.
      if (!req.file.mimetype.startsWith('image/')) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Ảnh đại diện phải là file ảnh (JPG, PNG, WEBP...).' });
      }
      try {
        const compressedPath = req.file.path + '.webp';
        await sharp(req.file.path)
          .resize(300, 300, { fit: 'cover' })
          .webp({ quality: 75 })
          .toFile(compressedPath);

        fs.unlinkSync(req.file.path);
        avatarUrl = `/uploads/${req.file.filename}.webp`;
      } catch {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'File ảnh không hợp lệ hoặc bị hỏng.' });
      }
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

const pinSchema = z.object({
  // Empty string / null clears the PIN (student goes back to open access).
  pin: z.union([z.string().regex(/^\d{4}$/, 'Mã PIN phải gồm đúng 4 chữ số'), z.literal(''), z.null()])
});

export const setStudentPin = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = pinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { id } = req.params;
    const parentId = req.user!.id;

    const student = await prisma.student.findUnique({ where: { id: id as string } });
    if (!student || student.parentId !== parentId) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const pin = parsed.data.pin;
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    await prisma.student.update({
      where: { id: id as string },
      data: { pinHash }
    });

    res.json({ hasPin: !!pinHash });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
