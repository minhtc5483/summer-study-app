import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../index';
import { generateSpeechWav } from '../lib/tts';

// Cached under uploads/ so it rides along with the same "runtime-generated files, not
// committed to git" convention as avatar uploads. Keyed by questionId, so re-reading the
// same question (very common — kids replay questions) never calls the Gemini API twice.
const cacheDir = path.join(__dirname, '../../uploads/tts-cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// The frontend now prefetches a question's audio as soon as it's shown (to hide the ~5-6s
// Gemini call behind the time a kid spends reading/answering) and the speaker button can
// still be tapped mid-prefetch. Without this map, both requests would see the cache file
// missing and each kick off their own generateSpeechWav call — same question, double the
// Gemini cost. In-flight generations are tracked here so a second request for the same
// questionId just waits on the first one instead of starting a duplicate.
const inFlight = new Map<string, Promise<void>>();

async function ensureCached(questionId: string, cachePath: string): Promise<void> {
  if (fs.existsSync(cachePath)) return;

  const existing = inFlight.get(questionId);
  if (existing) return existing;

  const promise = (async () => {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      throw Object.assign(new Error('Question not found'), { status: 404 });
    }

    let text = '';
    try {
      text = JSON.parse(question.content)?.text || '';
    } catch {
      // content wasn't valid JSON — falls through to the empty-text check below
    }
    if (!text.trim()) {
      throw Object.assign(new Error('Question has no readable text'), { status: 400 });
    }

    const wav = await generateSpeechWav(text);
    fs.writeFileSync(cachePath, wav);
  })();

  inFlight.set(questionId, promise);
  try {
    await promise;
  } finally {
    inFlight.delete(questionId);
  }
}

export const getQuestionSpeech = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId;
    if (typeof questionId !== 'string') {
      return res.status(400).json({ error: 'Missing questionId' });
    }
    const cachePath = path.join(cacheDir, `${questionId}.wav`);

    await ensureCached(questionId, cachePath);

    res.setHeader('Content-Type', 'audio/wav');
    // Content at this URL never changes for a given questionId (edits to a question aren't
    // expected to happen), so let the browser cache it indefinitely instead of refetching.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    fs.createReadStream(cachePath).pipe(res);
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(error?.status || 500).json({ error: error?.message || 'Không tạo được giọng đọc, thử lại nhé.' });
  }
};

// Fire-and-forget prefetch: the frontend calls this as soon as a question is shown, well
// before the kid necessarily taps the speaker, so the Gemini round-trip happens in the
// background instead of after the tap. Returns as soon as generation is scheduled — it does
// NOT wait for the (possibly several-second) generation to finish, unlike getQuestionSpeech.
export const prefetchQuestionSpeech = async (req: Request, res: Response) => {
  const questionId = req.params.questionId;
  if (typeof questionId !== 'string') {
    return res.status(400).json({ error: 'Missing questionId' });
  }
  const cachePath = path.join(cacheDir, `${questionId}.wav`);
  res.status(202).json({ status: 'scheduled' });

  // Runs after the response is already sent — errors here just get logged, since there's no
  // one left listening for a prefetch's outcome (the real fetch, whenever it happens, will
  // retry the generation itself if this one failed).
  ensureCached(questionId, cachePath).catch((err) => {
    console.error('TTS prefetch error:', err);
  });
};
