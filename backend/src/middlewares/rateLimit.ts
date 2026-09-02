import rateLimit from 'express-rate-limit';

// Limits brute-force attempts on login/register: 10 requests per 15 minutes per IP.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// A separate limiter for "just try it" buttons that cost a Gemini call (e.g. topic
// suggestions). Deliberately its own instance, not a reuse of authRateLimit — express-rate-
// limit counts per limiter instance per IP, so sharing one would mean a parent clicking
// "Gợi ý chủ đề" a few times eats into the same 10-per-15-min budget as their login/PIN
// attempts, and could lock them out of re-entering their manage PIN for something unrelated.
export const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn thử tính năng AI này hơi nhiều trong 15 phút qua. Vui lòng chờ một lát rồi thử lại.' },
});

// /auth/refresh fires silently in the background every time an access token expires (every
// 15 minutes per open tab — see the interceptor in frontend/src/lib/api.ts), which is normal,
// frequent, benign traffic completely unlike a login attempt. Sharing authRateLimit's 10-per-
// 15-min budget would mean a parent's own idle tabs quietly refreshing in the background could
// lock them out of actually logging in on a new device. Its own generous limit instead — high
// enough that normal multi-tab/multi-device use never hits it, low enough to still bound abuse
// (refresh tokens are single-use/rotated now, so this is a secondary defense, not the main one).
export const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
