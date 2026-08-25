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

export const getQuestionSpeech = async (req: Request, res: Response) => {
  try {
    const questionId = req.params.questionId;
    if (typeof questionId !== 'string') {
      return res.status(400).json({ error: 'Missing questionId' });
    }
    const cachePath = path.join(cacheDir, `${questionId}.wav`);

    if (!fs.existsSync(cachePath)) {
      const question = await prisma.question.findUnique({ where: { id: questionId } });
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      let text = '';
      try {
        text = JSON.parse(question.content)?.text || '';
      } catch {
        // content wasn't valid JSON — fall through with empty text below
      }
      if (!text.trim()) {
        return res.status(400).json({ error: 'Question has no readable text' });
      }

      const wav = await generateSpeechWav(text);
      fs.writeFileSync(cachePath, wav);
    }

    res.setHeader('Content-Type', 'audio/wav');
    // Content at this URL never changes for a given questionId (edits to a question aren't
    // expected to happen), so let the browser cache it indefinitely instead of refetching.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    fs.createReadStream(cachePath).pipe(res);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Không tạo được giọng đọc, thử lại nhé.' });
  }
};
