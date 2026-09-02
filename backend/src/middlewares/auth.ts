import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const _JWT_SECRET = process.env.JWT_SECRET;
const _JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!_JWT_SECRET || !_JWT_REFRESH_SECRET) {
  throw new Error(
    'JWT_SECRET and JWT_REFRESH_SECRET must be set in the environment (.env). Refusing to start with insecure defaults.'
  );
}

export const JWT_SECRET: string = _JWT_SECRET;
export const JWT_REFRESH_SECRET: string = _JWT_REFRESH_SECRET;

export interface AuthRequest extends Request {
  user?: { id: string; username: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// tokenVersion is only ever embedded in the refresh token, not the access token — see
// Parent.tokenVersion in schema.prisma. Access tokens are short-lived (15m) and don't need
// revocation; refresh tokens live 7 days and this is what makes a used one single-use.
export const generateTokens = (payload: { id: string; username: string }, tokenVersion: number) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ ...payload, tokenVersion }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};
