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

export const generateToken = (payload: { id: string; username: string }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const generateTokens = (payload: { id: string; username: string }) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};
