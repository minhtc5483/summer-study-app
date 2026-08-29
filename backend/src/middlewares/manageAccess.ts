import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AuthRequest, JWT_SECRET } from './auth';

const MANAGE_SCOPE = 'parent-manage';

// How long one PIN entry keeps the management area unlocked. Short on purpose: the whole
// point of the PIN is that a kid holding the family tablet can't wander into the parent
// area, and the parent's login session itself never really expires (the refresh token is
// rotated on every use, so it survives indefinitely as long as the app is opened weekly).
const MANAGE_TOKEN_TTL = '30m';

export const issueManageToken = (parentId: string) => {
  return jwt.sign({ id: parentId, scope: MANAGE_SCOPE }, JWT_SECRET, { expiresIn: MANAGE_TOKEN_TTL });
};

// Gate for every parent-management route. Runs *after* authenticate, so req.user is the
// logged-in parent; this only adds the second factor. Two distinct failures the frontend
// has to tell apart:
//   MANAGE_PIN_NOT_SET  -> parent hasn't chosen a PIN yet; let the request through and let
//                          the dashboard nag them to set one (otherwise upgrading the app
//                          would lock every existing parent out of their own account).
//   MANAGE_PIN_REQUIRED -> a PIN exists but this device hasn't entered it (or the 30 minutes
//                          lapsed) -> show the PIN prompt, do NOT log the parent out.
export const requireManage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const parentId = req.user?.id;
  if (!parentId) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  let parent;
  try {
    parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { managePinHash: true },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }

  if (!parent) {
    return res.status(401).json({ error: 'Access denied.' });
  }

  if (!parent.managePinHash) {
    return next();
  }

  const manageToken = req.header('X-Manage-Token');
  if (!manageToken) {
    return res.status(403).json({ error: 'MANAGE_PIN_REQUIRED' });
  }

  try {
    const decoded = jwt.verify(manageToken, JWT_SECRET) as { id?: string; scope?: string };
    if (decoded.scope !== MANAGE_SCOPE || decoded.id !== parentId) {
      throw new Error('Invalid manage token');
    }
    next();
  } catch {
    res.status(403).json({ error: 'MANAGE_PIN_REQUIRED' });
  }
};
