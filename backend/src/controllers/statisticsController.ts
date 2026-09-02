import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { BADGES } from './rewardController';

export const getStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    
    // Get all students for this parent
    const students = await prisma.student.findMany({
      where: { parentId },
      include: {
        progress: {
          include: {
            topic: true
          }
        },
        wrongAnswers: {
          include: {
            question: {
              include: {
                topic: true
              }
            }
          }
        }
      }
    });

    const stats = students.map(student => {
      let totalAttempted = 0;
      let totalCorrect = 0;
      let totalScore = student.totalScore;

      student.progress.forEach(p => {
        totalAttempted += p.questionsAttempted;
        totalCorrect += p.questionsCorrect;
      });

      const earnedBadges = BADGES.filter(badge => {
        if (badge.type === 'score' && totalScore >= badge.requirement) return true;
        if (badge.type === 'streak' && student.currentStreak >= badge.requirement) return true;
        return false;
      });

      return {
        studentId: student.id,
        name: student.name,
        currentStreak: student.currentStreak,
        totalScore,
        totalAttempted,
        totalCorrect,
        accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
        wrongQuestionsCount: (student as any).wrongAnswers?.length || 0,
        earnedBadges
      };
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStudentDetailedStats = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.params.studentId as string;
    const parentId = req.user!.id;

    // Verify ownership
    const student = await prisma.student.findUnique({
      where: { id: studentId, parentId },
      include: {
        examResults: {
          include: {
            exam: {
              include: { topic: { include: { subject: true } } }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        progress: {
          include: {
            topic: {
              include: { subject: true }
            }
          }
        },
        wrongAnswers: {
          include: {
            question: {
              include: { topic: { include: { subject: true } } }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const s = student as any;

    // Chart 1: Điểm qua các bài thi (Timeline)
    const timelineData = s.examResults.map((er: any) => ({
      date: er.createdAt.toISOString().split('T')[0],
      score: er.score,
      examName: er.exam.name
    }));

    // Chart 2: Mức độ thành thạo theo môn học
    const subjectStats: Record<string, { attempted: number, correct: number }> = {};
    s.progress.forEach((p: any) => {
      const subjName = p.topic.subject.name;
      if (!subjectStats[subjName]) {
        subjectStats[subjName] = { attempted: 0, correct: 0 };
      }
      subjectStats[subjName].attempted += p.questionsAttempted;
      subjectStats[subjName].correct += p.questionsCorrect;
    });

    const subjectData = Object.keys(subjectStats).map(name => {
      const stats = subjectStats[name] || { attempted: 0, correct: 0 };
      return {
        subject: name,
        accuracy: stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0
      };
    });

    // Chart 3: Tỉ lệ Đúng/Sai tổng quan
    let totalAttempted = 0;
    let totalCorrect = 0;
    s.progress.forEach((p: any) => {
      totalAttempted += p.questionsAttempted;
      totalCorrect += p.questionsCorrect;
    });

    const accuracyData = [
      { name: 'Đúng', value: totalCorrect, fill: '#34d399' },
      { name: 'Sai', value: totalAttempted - totalCorrect, fill: '#f87171' }
    ];

    // Chart 4: Thống kê lỗi sai theo độ khó
    const difficultyStats: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    s.wrongAnswers.forEach((wa: any) => {
      const level = wa.question?.level || 1;
      difficultyStats[level] = (difficultyStats[level] || 0) + 1;
    });
    const difficultyData = [
      { name: 'Dễ', value: difficultyStats[1], fill: '#60a5fa' },
      { name: 'Trung bình', value: difficultyStats[2], fill: '#fbbf24' },
      { name: 'Khó', value: difficultyStats[3], fill: '#f87171' }
    ];

    // Thời gian trung bình
    let totalTimeSpent = 0;
    let examsWithTime = 0;
    s.examResults.forEach((er: any) => {
      if (typeof er.timeSpent === 'number') {
        totalTimeSpent += er.timeSpent;
        examsWithTime++;
      }
    });
    const avgTimeSpent = examsWithTime > 0 ? Math.round(totalTimeSpent / examsWithTime) : 0;

    res.json({
      student: {
        id: student.id,
        name: student.name,
        avatar: student.avatar,
        totalScore: student.totalScore,
        currentStreak: student.currentStreak
      },
      timelineData,
      subjectData,
      accuracyData,
      difficultyData,
      summary: {
        totalExams: s.examResults.length,
        totalQuestions: totalAttempted,
        avgAccuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
        wrongCount: s.wrongAnswers.length,
        avgTimeSpent
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Activity log for the parent: one row per exam submission across all of their students,
// with student, subject/topic, correct/wrong count and time spent — the raw log behind
// the aggregate stats above.
export const getActivityLog = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;

    const results = await prisma.examResult.findMany({
      where: { student: { parentId } },
      include: {
        student: { select: { id: true, name: true, avatar: true } },
        exam: { include: { topic: { include: { subject: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const log = results.map((r) => {
      const attempted = r.questionsAttempted ?? 0;
      const correct = r.questionsCorrect ?? 0;
      return {
        id: r.id,
        student: r.student,
        examName: r.exam?.name || 'Đề thi',
        subjectName: r.exam?.topic?.subject?.name || 'Khác',
        questionsCorrect: correct,
        questionsWrong: Math.max(attempted - correct, 0),
        questionsAttempted: attempted,
        timeSpent: r.timeSpent,
        score: r.score,
        createdAt: r.createdAt
      };
    });

    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Full right/wrong breakdown behind one activity-log row or "vừa nộp bài" notification —
// the question text, the bé's own answer, and the correct one, per question. Answers are
// keyed by question index (see gradeExamSubmission in progressController.ts, which is the
// only place that writes ExamResult.answers) rather than question id, so questions are
// re-joined here in the same order the exam was graded in.
export const getExamResultDetail = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    const id = req.params.id as string;

    const result = await prisma.examResult.findFirst({
      where: { id, student: { parentId } },
      include: {
        student: { select: { id: true, name: true, avatar: true } },
        exam: {
          include: {
            topic: { include: { subject: true } },
            questions: { include: { question: true } }
          }
        }
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'Không tìm thấy kết quả bài làm này.' });
    }

    let answers: Record<string, string> = {};
    try {
      answers = result.answers ? JSON.parse(result.answers) : {};
    } catch {
      answers = {};
    }

    const questions = result.exam.questions.map((eq, idx) => {
      let text = '';
      let options: string[] | undefined;
      let correctAnswer: string | undefined;
      try {
        const parsed = JSON.parse(eq.question.content);
        text = parsed.text || '';
        options = parsed.options;
        correctAnswer = parsed.correct;
      } catch {
        text = eq.question.content;
      }

      const userAnswer = answers[String(idx)];
      return {
        index: idx + 1,
        text,
        options,
        correctAnswer,
        userAnswer: userAnswer ?? null,
        isCorrect: userAnswer !== undefined && correctAnswer !== undefined && userAnswer === correctAnswer
      };
    });

    res.json({
      id: result.id,
      student: result.student,
      examName: result.exam.name,
      subjectName: result.exam.topic?.subject?.name || 'Khác',
      topicName: result.exam.topic?.name || null,
      score: result.score,
      questionsAttempted: result.questionsAttempted ?? questions.length,
      questionsCorrect: result.questionsCorrect ?? questions.filter((q) => q.isCorrect).length,
      timeSpent: result.timeSpent,
      timeLimit: result.exam.timeLimit,
      createdAt: result.createdAt,
      questions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
