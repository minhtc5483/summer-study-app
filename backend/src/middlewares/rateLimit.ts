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
