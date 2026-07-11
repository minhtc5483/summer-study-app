import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BADGES = [
  { id: 'score_100', name: 'Tập Sự', description: 'Đạt 100 điểm', type: 'score', requirement: 100, icon: '🌟', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'score_500', name: 'Khởi Hành', description: 'Đạt 500 điểm', type: 'score', requirement: 500, icon: '🔥', color: 'bg-orange-100 text-orange-600' },
  { id: 'score_1000', name: 'Tăng Tốc', description: 'Đạt 1000 điểm', type: 'score', requirement: 1000, icon: '🚀', color: 'bg-purple-100 text-purple-600' },
  { id: 'score_2000', name: 'Chiến Binh', description: 'Đạt 2000 điểm', type: 'score', requirement: 2000, icon: '🛡️', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'score_3000', name: 'Hiệp Sĩ', description: 'Đạt 3000 điểm', type: 'score', requirement: 3000, icon: '⚔️', color: 'bg-red-100 text-red-600' },
  { id: 'score_5000', name: 'Thiên Tài', description: 'Đạt 5000 điểm', type: 'score', requirement: 5000, icon: '👑', color: 'bg-rose-100 text-rose-600' },
  { id: 'streak_3', name: 'Chăm Chỉ', description: 'Học 3 ngày liên tục', type: 'streak', requirement: 3, icon: '🌱', color: 'bg-green-100 text-green-600' },
  { id: 'streak_7', name: 'Bền Bỉ', description: 'Học 7 ngày liên tục', type: 'streak', requirement: 7, icon: '🌲', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'streak_14', name: 'Đại Bàng', description: 'Học 14 ngày liên tục', type: 'streak', requirement: 14, icon: '🦅', color: 'bg-sky-100 text-sky-600' },
  { id: 'streak_30', name: 'Vô Địch', description: 'Học 30 ngày liên tục', type: 'streak', requirement: 30, icon: '🏆', color: 'bg-blue-100 text-blue-600' },
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

export const exchangePoints = async (req: Request, res: Response) => {
  try {
    const { studentId, cost, itemName } = req.body;

    if (!studentId || cost === undefined || !itemName) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.totalScore < cost) {
      return res.status(400).json({ error: 'Not enough points' });
    }

    // Deduct points
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        totalScore: student.totalScore - cost
      }
    });

    // Record the transaction
    await prisma.reward.create({
      data: {
        studentId,
        badgeType: itemName
      }
    });

    res.json({ success: true, newTotalScore: updatedStudent.totalScore });
  } catch (error) {
    console.error('Exchange points error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
