import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
const getQuestionsSchema = z.object({
  topicId: z.string().optional(),
  level: z.string().regex(/^\d+$/).transform(Number).optional()
});

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const parsed = getQuestionsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, level } = parsed.data;
    const filter: Record<string, string | number> = {};
    if (topicId) filter.topicId = topicId;
    if (level) filter.level = level;

    const questions = await prisma.question.findMany({
      where: filter
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createQuestionSchema = z.object({
  topicId: z.string(),
  type: z.string(),
  content: z.any(),
  level: z.union([z.string().regex(/^\d+$/).transform(Number), z.number()]).optional().default(1),
  points: z.union([z.string().regex(/^\d+$/).transform(Number), z.number()]).optional().default(10)
});

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const parsed = createQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, type, content, level, points } = parsed.data;
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);

    const question = await prisma.question.create({
      data: {
        topicId,
        type,
        content: contentString,
        level,
        points
      }
    });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const importQuestionsSchema = z.object({
  topicId: z.string(),
  questions: z.array(z.object({
    type: z.string(),
    content: z.any(),
    level: z.number().optional().default(1),
    points: z.number().optional().default(10)
  }))
});

export const importQuestions = async (req: Request, res: Response) => {
  try {
    const parsed = importQuestionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { topicId, questions } = parsed.data;

    const data = questions.map(q => ({
      topicId,
      type: q.type,
      content: typeof q.content === 'string' ? q.content : JSON.stringify(q.content),
      level: q.level,
      points: q.points
    }));

    const result = await prisma.question.createMany({
      data
    });
    res.json({ message: 'Import successful', count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const importPDF = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.body;
    const file = req.file;

    if (!file || !topicId) {
      return res.status(400).json({ error: 'Missing file or topicId' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const fileBytes = fs.readFileSync(file.path);
    const base64Data = fileBytes.toString('base64');

    const prompt = `Bạn là một trợ lý giáo dục AI. Hãy đọc nội dung trong hình ảnh hoặc tài liệu PDF được cung cấp (thường là bài tập cho trẻ tiểu học) và trích xuất tất cả các câu hỏi (cả trắc nghiệm và tự luận) ra định dạng JSON.

Yêu cầu định dạng bắt buộc cho output là một mảng JSON:
[
  // Ví dụ 1: Câu trắc nghiệm
  {
    "type": "MULTIPLE_CHOICE",
    "level": 1,
    "points": 10,
    "content": {
      "text": "Câu hỏi trắc nghiệm là gì?",
      "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
      "correct": "Đáp án đúng"
    }
  },
  // Ví dụ 2: Câu tự luận (chỉ cần điền số hoặc chữ ngắn)
  {
    "type": "FILL_BLANK",
    "level": 2,
    "points": 20,
    "content": {
      "text": "Nội dung câu hỏi tự luận/đặt tính rồi tính...",
      "correct": "Kết quả đúng (chỉ ghi số hoặc đáp án ngắn)"
    }
  }
]

Quy tắc:
1. Đối với MULTIPLE_CHOICE, 'correct' phải khớp hoàn toàn (exact match) với một trong các chuỗi nằm trong mảng 'options'. Không ghi A, B, C, D nếu mảng options chứa giá trị nội dung.
2. Đối với FILL_BLANK (Tự luận), tuyệt đối không trả về trường 'options'. Trường 'correct' chỉ chứa kết quả cuối cùng (ví dụ: "45", "15 cm").
3. Output CHỈ LÀ MỘT CHUỖI JSON HỢP LỆ, không được có thẻ \`\`\`json ở đầu và \`\`\` ở cuối, không được có bất kỳ bình luận nào.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.mimetype,
          data: base64Data
        }
      }
    ]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let questionsParsed = [];
    try {
      questionsParsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return res.status(400).json({ error: 'AI trả về dữ liệu không đúng định dạng JSON' });
    }

    const data = questionsParsed.map((q: any) => ({
      topicId,
      type: q.type || 'MULTIPLE_CHOICE',
      content: JSON.stringify(q.content),
      level: q.level || 1,
      points: q.points || 10
    }));

    const createResult = await prisma.question.createMany({
      data
    });
    
    fs.unlinkSync(file.path);

    res.json({ message: 'Import successful', count: createResult.count });

  } catch (error) {
    console.error('Import PDF Error:', error);
    res.status(500).json({ error: 'Server error parsing AI' });
  }
};
