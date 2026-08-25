import { Request, Response } from 'express';
import { prisma } from '../index';
import { generateTokens, AuthRequest, JWT_REFRESH_SECRET } from '../middlewares/auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const BCRYPT_ROUNDS = 10;

const hashPassword = (password: string) => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

// Legacy hashing used before the bcrypt migration. Kept only to verify
// old password hashes on first login so they can be transparently upgraded.
const legacySha256 = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const isBcryptHash = (hash: string) => /^\$2[aby]\$/.test(hash);

// Verifies a password against a stored hash, supporting both bcrypt hashes
// and legacy plain SHA-256 hashes from before the security fix.
const verifyPassword = async (password: string, storedHash: string) => {
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }
  return legacySha256(password) === storedHash;
};

// Parent accounts are not tenant-isolated from each other for anything except the
// Student/Progress/Notification tables (Subject/Topic/Question/Exam are shared across
// every parent on this server — see database.md/schema.prisma). Since /auth/register was
// previously open to anyone on the network, any stranger who found the URL could create
// an account and tamper with the whole shared question bank / exam library. Require a
// secret invite code (set by whoever runs the server, shared only with the family) so
// registration still works for a second parent (e.g. mom + dad) without being public.
const REGISTER_INVITE_CODE = process.env.REGISTER_INVITE_CODE;
if (!REGISTER_INVITE_CODE) {
  throw new Error(
    'REGISTER_INVITE_CODE must be set in the environment (.env). Refusing to start with open self-registration.'
  );
}

const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(3),
});

const registerSchema = authSchema.extend({
  inviteCode: z.string().min(1),
});

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }
    const { username, password, inviteCode } = parsed.data;

    if (inviteCode !== REGISTER_INVITE_CODE) {
      return res.status(403).json({ error: 'Mã mời không hợp lệ' });
    }

    const existingUser = await prisma.parent.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const parent = await prisma.parent.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
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
    if (!parent || !(await verifyPassword(password, parent.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Transparently upgrade legacy SHA-256 hashes to bcrypt on successful login.
    if (!isBcryptHash(parent.passwordHash)) {
      await prisma.parent.update({
        where: { id: parent.id },
        data: { passwordHash: await hashPassword(password) },
      });
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
