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

export const saveProgress = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { studentId, topicId, questionsAttempted, questionsCorrect, score, wrongQuestions, examId, answers, timeSpent } = parsed.data;

    // Verify student ownership (Auth version)
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.parentId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized access to student' });
    }

    // Resolve topicId
    let actualTopicId = topicId;
    if (!actualTopicId) {
      const fallbackTopic = await prisma.topic.upsert({
        where: { id: 'default-topic-for-exam' },
        update: {},
        create: {
          id: 'default-topic-for-exam',
          name: 'Bài tập tổng hợp',
          grade: '1',
          subject: {
            create: { name: 'Khác' }
          }
        }
      });
      actualTopicId = fallbackTopic.id;
    }

    // 1. Update Student Progress
    await prisma.studentProgress.upsert({
      where: {
        studentId_topicId: { studentId, topicId: actualTopicId }
      },
      update: {
        questionsAttempted: { increment: questionsAttempted },
        questionsCorrect: { increment: questionsCorrect },
        score: { increment: score }
      },
      create: {
        studentId,
        topicId: actualTopicId,
        questionsAttempted,
        questionsCorrect,
        score
      }
    });

    // 2. Update Student Total Score and Streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = student.lastActive;
    let newStreak = student.currentStreak;
    
    if (lastActive) {
      const lastActiveDate = new Date(lastActive);
      lastActiveDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today.getTime() - lastActiveDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // reset streak if missed a day
      }
    } else {
      newStreak = 1;
    }

    await prisma.student.update({
      where: { id: studentId },
      data: {
        totalScore: { increment: score },
        lastActive: new Date(),
        currentStreak: newStreak
      }
    });

    // 3. Save Wrong Questions
    if (wrongQuestions && wrongQuestions.length > 0) {
      const wrongData = wrongQuestions.map((wq) => ({
        studentId,
        questionId: wq.questionId,
        userAnswer: wq.userAnswer ? JSON.stringify(wq.userAnswer) : null,
      }));
      await prisma.wrongQuestion.createMany({ data: wrongData });
    }

    res.json({ message: 'Progress saved successfully', newStreak });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const savePublicProgress = async (req: Request, res: Response) => {
  try {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { studentId, topicId, questionsAttempted, questionsCorrect, score, wrongQuestions, examId, answers } = parsed.data;

    // Verify student exists (Public version, no parent check)
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Resolve topicId from examId if not provided
    let actualTopicId = topicId;
    if (!actualTopicId && examId) {
      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (exam) {
        actualTopicId = exam.topicId;
      }
    }

    if (!actualTopicId) {
      // Create a fallback topic if it doesn't exist
      const fallbackTopic = await prisma.topic.upsert({
        where: { id: 'default-topic-for-exam' },
        update: {},
        create: {
          id: 'default-topic-for-exam',
          name: 'Bài tập tổng hợp',
          grade: '1',
          subject: {
            create: { name: 'Khác' }
          }
        }
      });
      actualTopicId = fallbackTopic.id;
    }

    // 1. Update Student Progress
    await prisma.studentProgress.upsert({
      where: {
        studentId_topicId: { studentId, topicId: actualTopicId }
      },
      update: {
        questionsAttempted: { increment: questionsAttempted },
        questionsCorrect: { increment: questionsCorrect },
        score: { increment: score }
      },
      create: {
        studentId,
        topicId: actualTopicId,
        questionsAttempted,
        questionsCorrect,
        score
      }
    });

    // 2. Update Student Total Score and Streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = student.lastActive;
    let newStreak = student.currentStreak;
    
    if (lastActive) {
      const lastActiveDate = new Date(lastActive);
      lastActiveDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today.getTime() - lastActiveDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // reset streak if missed a day
      }
    } else {
      newStreak = 1;
    }

    await prisma.student.update({
      where: { id: studentId },
      data: {
        totalScore: { increment: score },
        lastActive: new Date(),
        currentStreak: newStreak
      }
    });

    // 3. Save Wrong Questions
    if (wrongQuestions && wrongQuestions.length > 0) {
      const wrongData = wrongQuestions.map((wq) => ({
        studentId,
        questionId: wq.questionId,
        userAnswer: wq.userAnswer ? JSON.stringify(wq.userAnswer) : null,
      }));
      await prisma.wrongQuestion.createMany({ data: wrongData });
    }

    // 2. Tùy chọn: Lưu ExamResult nếu có examId
    if (examId) {
      await prisma.examResult.upsert({
        where: {
          studentId_examId: {
            studentId,
            examId
          }
        },
        update: {
          score: Math.max(score, 0), // Cập nhật điểm cao nhất nếu cần, hoặc ghi đè
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

    // 4. Create Notification for Parent
    const minToMS = 60000;
    // We assume the user finished recently. If we tracked exact time we could say "in X mins".
    await prisma.notification.create({
      data: {
        parentId: student.parentId,
        title: `🎉 ${student.name} vừa nộp bài!`,
        message: `Bé đạt được ${score} điểm với ${questionsCorrect}/${questionsAttempted} câu đúng.`,
      }
    });

    res.json({ message: 'Progress saved successfully', newStreak });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
