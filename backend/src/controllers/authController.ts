import { Request, Response } from 'express';
import { prisma } from '../index';
import { generateTokens, AuthRequest, JWT_REFRESH_SECRET } from '../middlewares/auth';
import { issueManageToken } from '../middlewares/manageAccess';
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

// --- Parent management PIN -------------------------------------------------------------
// The login session itself is effectively permanent (tokens live in localStorage and the
// refresh token is rotated on every use), so "are you logged in?" stopped being a real gate
// on a tablet the kids also use. These three endpoints add a short PIN that has to be
// re-entered to open the management area — same idea as the per-student PINs on the kids
// side, see kidsAccessController.

const managePinSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/, 'PIN phải gồm 4-8 chữ số'),
});

// Changing/clearing the PIN requires the account password, so someone who walks up to an
// already-unlocked tablet can't just overwrite the PIN with one of their own.
const setManagePinSchema = z.object({
  pin: z.union([z.string().regex(/^\d{4,8}$/), z.literal('')]),
  password: z.string().min(1),
});

export const getManagePinStatus = async (req: AuthRequest, res: Response) => {
  try {
    const parent = await prisma.parent.findUnique({
      where: { id: req.user!.id },
      select: { managePinHash: true },
    });
    res.json({ hasPin: !!parent?.managePinHash });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const setManagePin = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = setManagePinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Mã PIN phải gồm 4-8 chữ số.' });
    }

    const parent = await prisma.parent.findUnique({ where: { id: req.user!.id } });
    if (!parent || !(await verifyPassword(parsed.data.password, parent.passwordHash))) {
      return res.status(401).json({ error: 'Mật khẩu không đúng.' });
    }

    const { pin } = parsed.data;
    await prisma.parent.update({
      where: { id: parent.id },
      data: { managePinHash: pin === '' ? null : await hashPassword(pin) },
    });

    // Setting a PIN also unlocks the current device, so the parent isn't immediately locked
    // out of the page they're standing on.
    res.json({ hasPin: pin !== '', manageToken: pin === '' ? null : issueManageToken(parent.id) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const verifyManagePin = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = managePinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Mã PIN phải gồm 4-8 chữ số.' });
    }

    const parent = await prisma.parent.findUnique({ where: { id: req.user!.id } });
    if (!parent) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!parent.managePinHash) {
      // No PIN configured — nothing to verify, hand out a token so the UI can move on.
      return res.json({ manageToken: issueManageToken(parent.id) });
    }

    if (!(await bcrypt.compare(parsed.data.pin, parent.managePinHash))) {
      return res.status(401).json({ error: 'Sai mã PIN' });
    }

    res.json({ manageToken: issueManageToken(parent.id) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Đổi mật khẩu tài khoản phụ huynh. Trước đây quên mật khẩu là phải SSH vào Raspberry Pi
// chạy script cập nhật thẳng vào database — không có màn hình nào trong app làm được việc này.
// Vẫn bắt nhập mật khẩu hiện tại: trang Cài Đặt nằm sau chốt PIN quản lý, nhưng PIN chỉ dài
// 4-8 chữ số nên nó không đủ mạnh để một mình gác việc chiếm tài khoản.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const { currentPassword, newPassword } = parsed.data;

    const parent = await prisma.parent.findUnique({ where: { id: req.user!.id } });
    if (!parent || !(await verifyPassword(currentPassword, parent.passwordHash))) {
      return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Mật khẩu mới trùng với mật khẩu cũ.' });
    }

    await prisma.parent.update({
      where: { id: parent.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    // Các phiên đăng nhập khác vẫn dùng được token cũ cho tới khi hết hạn — app không có cơ
    // chế thu hồi token. Nói rõ điều này cho phụ huynh thay vì để họ tưởng đã đá được máy khác.
    res.json({ message: 'Đã đổi mật khẩu' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
