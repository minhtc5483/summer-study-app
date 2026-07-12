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
      summary: {
        totalExams: s.examResults.length,
        totalQuestions: totalAttempted,
        avgAccuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
        wrongCount: s.wrongAnswers.length
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
