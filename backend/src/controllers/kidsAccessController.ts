import { Request, Response } from 'express';
import { z } from 'zod';
import { issueKidsAccessToken } from '../middlewares/kidsAccess';

const pinSchema = z.object({
  pin: z.string().min(1),
});

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
