// Must run before any local module is imported: middlewares/auth.ts and
// middlewares/kidsAccess.ts read their required secrets from process.env at module
// load time (and throw immediately if missing). If dotenv.config() ran after those
// imports, process.env wouldn't be populated from .env yet and the server would crash
// on startup on any machine that doesn't already have these set as real OS env vars
// (this is exactly what was crash-looping the Raspberry Pi deployment).
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import routes from './routes';
import { failInterruptedAiExamJobs } from './controllers/aiExamJobController';
import './cron'; // Start cron jobs

const app = express();
const port = process.env.PORT || 3000;

// Cloudflare Tunnel (cloudflared) sits directly in front of this server as the only proxy
// hop, forwarding the real client IP via X-Forwarded-For. Without this, Express leaves
// 'trust proxy' at its default (false), so express-rate-limit refuses to trust that header
// and throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every rate-limited request in production.
app.set('trust proxy', 1);

export const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Frontend is served by this same server (same-origin) whenever someone hits it directly
// — production via the real domain, or local testing via http://localhost:<port> — so CORS
// only needs to matter for local dev (Vite on a different port) and any extra allowed
// domains. The catch: browsers attach an Origin header to fetch/XHR calls even for
// same-origin requests, so a same-origin request still has to be recognized as such here,
// not just "no Origin header" — comparing against the request's own Host does that
// regardless of hostname/port (localhost, 127.0.0.1, a LAN IP, the real domain, ...),
// instead of hardcoding one specific origin (this previously only allowed the Vite dev
// port and ALLOWED_ORIGINS, so opening the built app directly on its own port was
// rejected as cross-origin even though it's the same origin serving it).
const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || []),
  'http://localhost:5173',
];

app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      const sameOrigin = !!origin && (origin === `http://${req.headers.host}` || origin === `https://${req.headers.host}`);
      // Allow requests with no Origin header (curl, mobile webviews, ...), same-origin
      // requests, and anything explicitly allow-listed.
      if (!origin || sameOrigin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })(req, res, next);
});
// A 30-question CSV is only ~9KB, but a parent importing a whole subject in one file blows
// straight past body-parser's 100KB default and gets an opaque 413 (the browser only shows
// "Có lỗi xảy ra"). 5MB covers ~15k questions with room to spare.
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api', routes);

// Serve frontend static files
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

app.use((req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  // AI exam jobs run in this process, so a restart strands any that were mid-flight.
  failInterruptedAiExamJobs().catch((err) => console.error('Failed to reconcile AI exam jobs:', err));
});
