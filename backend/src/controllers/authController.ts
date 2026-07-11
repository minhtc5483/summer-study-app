import { Request, Response } from 'express';
import { prisma } from '../index';
import { generateTokens, AuthRequest } from '../middlewares/auth';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-for-summer-app';

const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(3),
});

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }
    const { username, password } = parsed.data;
    
    const existingUser = await prisma.parent.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const parent = await prisma.parent.create({
      data: {
        username,
        passwordHash: hashPassword(password),
      },
    });

    const tokens = generateTokens({ id: parent.id, username: parent.username });
    res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: parent.id, username: parent.username } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }
    const { username, password } = parsed.data;

    const parent = await prisma.parent.findUnique({ where: { username } });
    if (!parent || parent.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens({ id: parent.id, username: parent.username });
    res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: parent.id, username: parent.username } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; username: string };
    
    const parent = await prisma.parent.findUnique({ where: { id: decoded.id } });
    if (!parent) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const tokens = generateTokens({ id: parent.id, username: parent.username });
    res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
       return res.status(401).json({ error: 'Not authenticated' });
    }
    const parent = await prisma.parent.findUnique({ 
      where: { id: req.user.id },
      select: { id: true, username: true, createdAt: true }
    });
    res.json(parent);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
