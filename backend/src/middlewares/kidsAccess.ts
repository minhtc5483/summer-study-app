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

export interface KidsAccessRequest extends Request {
  // Set by requireKidsAccess after verifying the token. studentId is present for the normal
  // per-student PIN flow (verifyStudentPin) and absent only for the legacy family-wide PIN
  // (verifyFamilyPin) — see requireStudentMatch below for what that distinction means.
  kidsAccess?: { studentId?: string };
}

// Issued after a correct PIN is submitted — either a student's own PIN (bound to that one
// student) or, for backward compatibility, the legacy family-wide PIN (unbound). Long-lived
// since it just gates the public/unauthenticated kids endpoints on a device the family
// already trusts.
export const issueKidsAccessToken = (studentId?: string) => {
  return jwt.sign({ scope: KIDS_SCOPE, studentId }, KIDS_ACCESS_SECRET, { expiresIn: '180d' });
};

export const requireKidsAccess = (req: KidsAccessRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'PIN_REQUIRED' });
  }

  try {
    const decoded = jwt.verify(token, KIDS_ACCESS_SECRET) as { scope?: string; studentId?: string };
    if (decoded.scope !== KIDS_SCOPE) {
      throw new Error('Invalid scope');
    }
    req.kidsAccess = { studentId: decoded.studentId };
    next();
  } catch {
    res.status(401).json({ error: 'PIN_REQUIRED' });
  }
};

// Closes an IDOR: requireKidsAccess only used to check "is this a valid kids token", not
// "does it belong to the student this request is about to read or write". A token minted for
// one bé (e.g. by entering their own PIN) could otherwise be replayed with a different
// studentId on /public/submit, /public/exchange-points, /public/rewards/:id, etc. — reading
// or spending a sibling's points, or overwriting their score — exactly what per-student PINs
// in Settings are supposed to prevent.
//
// Must run after requireKidsAccess. getStudentId reads the target student id out of the
// request (params/query/body, whichever that route uses); when the token is bound to one
// student (the normal case), it must match. A legacy family-wide token (no studentId claim —
// see issueKidsAccessToken) has no single student to compare against, so it is left exactly
// as permissive as it always was: this only tightens the per-student flow, it doesn't take
// anything away from the already-documented "family-wide" one.
export const requireStudentMatch = (getStudentId: (req: Request) => string | undefined) => {
  return (req: KidsAccessRequest, res: Response, next: NextFunction) => {
    const boundStudentId = req.kidsAccess?.studentId;
    const targetStudentId = getStudentId(req);

    if (boundStudentId && targetStudentId && boundStudentId !== targetStudentId) {
      return res.status(401).json({ error: 'PIN_REQUIRED' });
    }
    next();
  };
};
