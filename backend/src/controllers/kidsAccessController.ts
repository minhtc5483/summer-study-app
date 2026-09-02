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

// Per-student PIN, set by the parent in Settings. Every /public/* route past the student
// picker (rewards, exam list, submit, ...) is gated by requireKidsAccess and needs a valid
// kids-access token — there is no other way to get one now that the family-wide PIN screen
// isn't shown first. So this endpoint is called for EVERY student on entry, PIN or not:
// a student with no PIN configured (pinHash === null) gets the token immediately, no PIN
// needed; a student with a PIN needs it verified first. The token is bound to this one
// student (requireStudentMatch enforces it elsewhere), so it can't be replayed against a
// sibling's studentId to read or spend their points.
export const verifyStudentPin = async (req: Request, res: Response) => {
  const studentId = req.params.studentId as string;

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  if (!student.pinHash) {
    return res.json({ accessToken: issueKidsAccessToken(student.id) });
  }

  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  const isMatch = await bcrypt.compare(parsed.data.pin, student.pinHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Sai mã PIN' });
  }

  res.json({ accessToken: issueKidsAccessToken(student.id) });
};
