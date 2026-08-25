import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { issueKidsAccessToken } from '../middlewares/kidsAccess';
import { prisma } from '../index';

const pinSchema = z.object({
  pin: z.string().min(1),
});

// Legacy family-wide PIN gate. Kept for backward compatibility (any token it issues still
// works on every /public/* route), but the "who's studying" screen now shows student
// avatars directly and gates per-student instead — see verifyStudentPin below.
export const verifyFamilyPin = (req: Request, res: Response) => {
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  const familyPin = process.env.FAMILY_PIN;
  if (!familyPin) {
    // Misconfiguration — fail closed rather than silently accepting any PIN.
    return res.status(500).json({ error: 'Server misconfigured: FAMILY_PIN not set' });
  }

  if (parsed.data.pin !== familyPin) {
    return res.status(401).json({ error: 'Sai mã PIN' });
  }

  res.json({ accessToken: issueKidsAccessToken() });
};

// Per-student PIN, set by the parent in Settings. A student with no PIN configured
// (pinHash === null) needs no verification at all — the frontend skips calling this and
// logs the student in directly. Issues the same kind of token as the family PIN so every
// existing /public/* route works unchanged.
export const verifyStudentPin = async (req: Request, res: Response) => {
  const studentId = req.params.studentId as string;
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  if (!student.pinHash) {
    return res.status(400).json({ error: 'Bé này chưa cần mã PIN' });
  }

  const isMatch = await bcrypt.compare(parsed.data.pin, student.pinHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Sai mã PIN' });
  }

  res.json({ accessToken: issueKidsAccessToken() });
};
