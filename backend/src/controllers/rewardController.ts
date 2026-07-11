import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BADGES = [
  { id: 'score_100', name: 'Tập Sự', description: 'Đạt 100 điểm đầu tiên', type: 'score', requirement: 100, icon: '🌟', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'score_500', name: 'Chăm Chỉ', description: 'Đạt 500 điểm', type: 'score', requirement: 500, icon: '🔥', color: 'bg-orange-100 text-orange-600' },
  { id: 'score_1000', name: 'Ngôi Sao', description: 'Đạt 1000 điểm', type: 'score', requirement: 1000, icon: '⭐', color: 'bg-purple-100 text-purple-600' },
  { id: 'score_5000', name: 'Thiên Tài', description: 'Đạt 5000 điểm', type: 'score', requirement: 5000, icon: '👑', color: 'bg-rose-100 text-rose-600' },
  { id: 'streak_3', name: 'Bền Bỉ (3)', description: 'Học 3 ngày liên tiếp', type: 'streak', requirement: 3, icon: '🌱', color: 'bg-green-100 text-green-600' },
  { id: 'streak_7', name: 'Bền Bỉ (7)', description: 'Học 7 ngày liên tiếp', type: 'streak', requirement: 7, icon: '🌲', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'streak_30', name: 'Vô Địch (30)', description: 'Học 30 ngày liên tiếp', type: 'streak', requirement: 30, icon: '🏆', color: 'bg-blue-100 text-blue-600' },
];

export const getRewards = async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId as string;

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { totalScore, currentStreak } = student;

    // Calculate earned badges dynamically
    const badges = BADGES.map(badge => {
      let isEarned = false;
      if (badge.type === 'score' && totalScore >= badge.requirement) {
        isEarned = true;
      }
      if (badge.type === 'streak' && currentStreak >= badge.requirement) {
        isEarned = true;
      }

      // Calculate progress if not earned
      let progress = 100;
      if (!isEarned) {
        if (badge.type === 'score') {
          progress = Math.floor((totalScore / badge.requirement) * 100);
        } else {
          progress = Math.floor((currentStreak / badge.requirement) * 100);
        }
      }

      return {
        ...badge,
        isEarned,
        progress: Math.min(Math.max(progress, 0), 100)
      };
    });

    res.json({
      studentId: student.id,
      totalScore,
      currentStreak,
      badges
    });
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
