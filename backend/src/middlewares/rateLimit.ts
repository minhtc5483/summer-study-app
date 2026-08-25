import rateLimit from 'express-rate-limit';

// Limits brute-force attempts on login/register: 10 requests per 15 minutes per IP.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
