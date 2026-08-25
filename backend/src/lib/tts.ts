import { GoogleGenAI, Modality } from '@google/genai';

// Server-side text-to-speech via Gemini's TTS model. Replaces relying on the browser's
// built-in Web Speech API (window.speechSynthesis), whose voice quality and even Vietnamese
// availability varies wildly by device/OS — some machines have no Vietnamese voice at all,
// others only a robotic offline one. Generating the audio here gives every kid the same
// warm, natural voice regardless of what device they're on.
let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// gemini-2.5-flash-preview-tts is Gemini's dedicated speech-generation model. It auto-detects
// the input language (Vietnamese included) rather than needing a separate translation step.
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// "Leda" is one of Gemini's prebuilt voices, described by Google as youthful/friendly — a
// better fit for reading questions to young kids than a flat, neutral voice. Swap the name
// here to try another (Kore, Puck, Aoede, ... — see Gemini API docs for the full list).
const VOICE_NAME = 'Leda';

/**
 * Generates natural-sounding Vietnamese speech for `text` and returns it as a playable WAV
 * file buffer. Gemini's TTS response is raw PCM (no container), so this wraps it in a
 * standard 44-byte WAV header using the sample rate the API reports back.
 */
export async function generateSpeechWav(text: string): Promise<Buffer> {
  // Observed in practice: the API occasionally comes back with no audio part on an
  // otherwise-successful call (no error thrown, just an empty result) — a transient hiccup,
  // not a bad prompt or invalid config, since retrying the exact same request immediately
  // after succeeds. A couple of quick retries smooths that over instead of surfacing
  // "Không tạo được giọng đọc" to a kid over what's really just a one-off network blip.
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await requestSpeech(text);
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError;
}

async function requestSpeech(text: string): Promise<Buffer> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [
      {
        parts: [
          {
            text: `Đọc to câu hỏi sau bằng giọng ấm áp, thân thiện, rõ ràng, tốc độ vừa phải, phù hợp cho học sinh tiểu học nghe: ${text}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        languageCode: 'vi-VN',
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: VOICE_NAME },
        },
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  const inlineData = part?.inlineData;
  if (!inlineData?.data) {
    throw new Error('Gemini TTS did not return audio data');
  }

  const pcm = Buffer.from(inlineData.data, 'base64');
  const sampleRate = parseSampleRate(inlineData.mimeType) ?? 24000;
  return pcmToWav(pcm, sampleRate, 1, 16);
}

// Gemini reports the sample rate inside the mimeType string, e.g. "audio/L16;codec=pcm;rate=24000".
// Parse it instead of hardcoding, so a future model change that returns a different rate
// still produces correctly-pitched audio instead of silently playing too fast/slow.
function parseSampleRate(mimeType?: string): number | null {
  const rateStr = mimeType?.match(/rate=(\d+)/)?.[1];
  return rateStr ? parseInt(rateStr, 10) : null;
}

function pcmToWav(pcmData: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // fmt chunk size (PCM)
  header.writeUInt16LE(1, 20); // audio format = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}
