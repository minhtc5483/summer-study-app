import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

const wrongQuestionSchema = z.object({
  questionId: z.string(),
  userAnswer: z.any().optional()
});

const progressSchema = z.object({
  studentId: z.string(),
  topicId: z.string().optional(),
  questionsAttempted: z.number().int().min(0).optional().default(0),
  questionsCorrect: z.number().int().min(0).optional().default(0),
  score: z.number().int().min(0),
  wrongQuestions: z.array(wrongQuestionSchema).optional(),
  examId: z.string().optional(),
  answers: z.record(z.string(), z.string()).optional(), // e.g. { "0": "Option A", "1": "Option B" }
  timeSpent: z.number().int().min(0).optional()
});

type ProgressInput = z.infer<typeof progressSchema>;

const DEFAULT_TOPIC_ID = 'default-topic-for-exam';

interface GradedWrongQuestion {
  questionId: string;
  userAnswer: unknown;
}

interface GradedResult {
  questionsAttempted: number;
  questionsCorrect: number;
  score: number;
  wrongQuestions: GradedWrongQuestion[];
}

// Re-grades a submission against the exam's real questions instead of trusting the
// client-reported score/correctness. Without this, anyone could edit the /submit request
// (or the in-browser JS) to report an arbitrary score — which matters here because points
// are redeemable for screen time (see rewardController/exchangePoints). The server is now
// the sole source of truth for what counts as correct and how many points it's worth.
async function gradeExamSubmission(
  examId: string,
  answers: Record<string, string> | undefined,
  timeSpent: number | undefined
): Promise<GradedResult | null> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { include: { question: true } } }
  });

  if (!exam || exam.questions.length === 0) {
    return null; // No ground truth available — caller falls back to the client-reported values.
  }

  let questionsCorrect = 0;
  let score = 0;
  const wrongQuestions: GradedWrongQuestion[] = [];

  exam.questions.forEach((eq, idx) => {
    const question = eq.question;
    const userAnswer = answers?.[String(idx)];

    let correctAnswer: string | undefined;
    try {
      correctAnswer = JSON.parse(question.content)?.correct;
    } catch {
      correctAnswer = undefined;
    }

    const isCorrect = userAnswer !== undefined && correctAnswer !== undefined && userAnswer === correctAnswer;
    if (isCorrect) {
      questionsCorrect += 1;
      score += question.points;
    } else {
      wrongQuestions.push({ questionId: question.id, userAnswer: userAnswer ?? null });
    }
  });

  // Speed bonus mirrors the client's own formula (Math.floor(timeLeft / 10)), but is
  // recomputed here from the exam's real time limit and the reported time spent so it
  // can't be inflated past what the exam's time limit actually allows.
  let timeBonus = 0;
  if (exam.timeLimit && exam.timeLimit > 0 && typeof timeSpent === 'number') {
    const timeLimitSeconds = exam.timeLimit * 60;
    const remaining = Math.max(timeLimitSeconds - timeSpent, 0);
    timeBonus = Math.floor(Math.min(remaining, timeLimitSeconds) / 10);
  }

  return {
    questionsAttempted: exam.questions.length,
    questionsCorrect,
    score: score + timeBonus,
    wrongQuestions
  };
}

// Same day-streak logic used by both the parent and kids submission paths.
function computeStreak(student: { lastActive: Date | null; currentStreak: number }): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = student.lastActive;
  let newStreak = student.currentStreak;

  if (lastActive) {
    const lastActiveDate = new Date(lastActive);
    lastActiveDate.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today.getTime() - lastActiveDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1; // reset streak if a day was missed
    } else if (diffDays === 0 && newStreak === 0) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  return newStreak;
}

async function resolveTopicId(topicId: string | undefined, examId: string | undefined): Promise<string> {
  if (topicId) return topicId;

  if (examId) {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (exam) return exam.topicId;
  }

  const fallbackTopic = await prisma.topic.upsert({
    where: { id: DEFAULT_TOPIC_ID },
    update: {},
    create: {
      id: DEFAULT_TOPIC_ID,
      name: 'Bài tập tổng hợp',
      grade: '1',
      subject: { create: { name: 'Khác' } }
    }
  });
  return fallbackTopic.id;
}

interface ApplyProgressResult {
  newStreak: number;
  questionsAttempted: number;
  questionsCorrect: number;
  score: number;
}

// Shared write path for both the authenticated (/submit, parent-triggered) and public
// (kids app) progress endpoints. Re-grades against the exam if one is referenced, then
// applies the (now server-verified) numbers to StudentProgress / Student / WrongQuestion.
async function applyProgress(
  student: { id: string; lastActive: Date | null; currentStreak: number },
  data: ProgressInput
): Promise<ApplyProgressResult> {
  const { studentId, topicId, examId, answers, timeSpent } = data;

  const graded = examId ? await gradeExamSubmission(examId, answers, timeSpent) : null;

  const questionsAttempted = graded ? graded.questionsAttempted : data.questionsAttempted;
  const questionsCorrect = graded ? graded.questionsCorrect : data.questionsCorrect;
  const score = graded ? graded.score : data.score;
  const wrongQuestions: GradedWrongQuestion[] = graded
    ? graded.wrongQuestions
    : (data.wrongQuestions || []).map((wq) => ({ questionId: wq.questionId, userAnswer: wq.userAnswer ?? null }));

  const actualTopicId = await resolveTopicId(topicId, examId);

  await prisma.studentProgress.upsert({
    where: { studentId_topicId: { studentId, topicId: actualTopicId } },
    update: {
      questionsAttempted: { increment: questionsAttempted },
      questionsCorrect: { increment: questionsCorrect },
      score: { increment: score }
    },
    create: { studentId, topicId: actualTopicId, questionsAttempted, questionsCorrect, score }
  });

  const newStreak = computeStreak(student);

  await prisma.student.update({
    where: { id: studentId },
    data: {
      totalScore: { increment: score },
      lastActive: new Date(),
      currentStreak: newStreak
    }
  });

  if (wrongQuestions.length > 0) {
    await prisma.wrongQuestion.createMany({
      data: wrongQuestions.map((wq) => ({
        studentId,
        questionId: wq.questionId,
        userAnswer: wq.userAnswer != null ? JSON.stringify(wq.userAnswer) : null
      }))
    });
  }

  return { newStreak, questionsAttempted, questionsCorrect, score };
}

export const saveProgress = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    // Verify student ownership (Auth version)
    const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId } });
    if (!student || student.parentId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized access to student' });
    }

    const { newStreak } = await applyProgress(student, parsed.data);

    res.json({ message: 'Progress saved successfully', newStreak });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const savePublicProgress = async (req: Request, res: Response) => {
  try {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { studentId, examId, answers, timeSpent } = parsed.data;

    // Verify student exists (Public version, no parent check)
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { newStreak, questionsAttempted, questionsCorrect, score } = await applyProgress(student, parsed.data);

    // Save ExamResult if an examId was provided — uses the server-verified score, not
    // whatever the client sent.
    if (examId) {
      await prisma.examResult.upsert({
        where: { studentId_examId: { studentId, examId } },
        update: {
          score,
          answers: answers ? JSON.stringify(answers) : undefined,
          timeSpent: timeSpent !== undefined ? timeSpent : undefined
        },
        create: {
          studentId,
          examId,
          score,
          answers: answers ? JSON.stringify(answers) : null,
          timeSpent: timeSpent !== undefined ? timeSpent : null
        }
      });
    }

    // Notify parent
    await prisma.notification.create({
      data: {
        parentId: student.parentId,
        title: `🎉 ${student.name} vừa nộp bài!`,
        message: `Bé đạt được ${score} điểm với ${questionsCorrect}/${questionsAttempted} câu đúng.`
      }
    });

    res.json({ message: 'Progress saved successfully', newStreak });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
