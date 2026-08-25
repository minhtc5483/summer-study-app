import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const _KIDS_ACCESS_SECRET = process.env.KIDS_ACCESS_SECRET;

if (!_KIDS_ACCESS_SECRET) {
  throw new Error(
    'KIDS_ACCESS_SECRET must be set in the environment (.env). Refusing to start without it.'
  );
}

export const KIDS_ACCESS_SECRET: string = _KIDS_ACCESS_SECRET;

const KIDS_SCOPE = 'kids-public';

// Issued after a correct FAMILY_PIN is submitted. Long-lived since it just gates the
// public/unauthenticated kids endpoints on a device the family already trusts.
export const issueKidsAccessToken = () => {
  return jwt.sign({ scope: KIDS_SCOPE }, KIDS_ACCESS_SECRET, { expiresIn: '180d' });
};

export const requireKidsAccess = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'PIN_REQUIRED' });
  }

  try {
    const decoded = jwt.verify(token, KIDS_ACCESS_SECRET) as { scope?: string };
    if (decoded.scope !== KIDS_SCOPE) {
      throw new Error('Invalid scope');
    }
    next();
  } catch {
    res.status(401).json({ error: 'PIN_REQUIRED' });
  }
};
