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
        wrongQuestions: {
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
        wrongQuestionsCount: (student as any).wrongQuestions?.length || 0,
        earnedBadges
      };
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
