import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';

// Score tiers, recalibrated so the top tier lines up with the "streak_30" badge below.
// Daily practice target (per the family's actual routine): 1 exam per subject per day
// across 3 subjects (Toán, Tiếng Việt, Tiếng Anh), each exam ~30-50 questions (avg ~40) at
// the default 10 pts/question => ~3 * 40 * 10 = 1200 pts/day at 100% correct. Discounted
// for a realistic mixed-difficulty (dễ/trung bình/khó) accuracy rate, ~1000 pts/day is a
// fair steady-practice estimate, so 30 days of uninterrupted practice => ~30,000 points —
// the highest tier sits at 30,000, reachable roughly when the 30-day streak is reached.
// The old scheme doubled every level (100, 200, 400, ... to level 40 ≈ 5.5×10^13) and was
// never realistically reachable past the first few levels.
const SCORE_TIERS: { requirement: number; name: string; icon: string; color: string }[] = [
  { requirement: 1000, name: 'Tân Binh', icon: '🌱', color: 'bg-green-100 text-green-600' },
  { requirement: 2700, name: 'Chăm Học', icon: '📖', color: 'bg-lime-100 text-lime-600' },
  { requirement: 5000, name: 'Tiến Bộ', icon: '⭐', color: 'bg-yellow-100 text-yellow-600' },
  { requirement: 7500, name: 'Giỏi Giang', icon: '🚀', color: 'bg-amber-100 text-amber-600' },
  { requirement: 10500, name: 'Xuất Sắc', icon: '🎯', color: 'bg-orange-100 text-orange-600' },
  { requirement: 14000, name: 'Chuyên Cần', icon: '🔥', color: 'bg-red-100 text-red-600' },
  { requirement: 17500, name: 'Tài Năng', icon: '💎', color: 'bg-rose-100 text-rose-600' },
  { requirement: 21500, name: 'Ngôi Sao', icon: '👑', color: 'bg-purple-100 text-purple-600' },
  { requirement: 25500, name: 'Bậc Thầy', icon: '🏅', color: 'bg-indigo-100 text-indigo-600' },
  { requirement: 30000, name: 'Huyền Thoại', icon: '🏆', color: 'bg-blue-100 text-blue-600' },
];

export const BADGES: any[] = SCORE_TIERS.map((tier, idx) => ({
  id: `score_lv${idx + 1}`,
  name: tier.name,
  description: `Đạt ${tier.requirement.toLocaleString('vi-VN')} điểm`,
  type: 'score',
  requirement: tier.requirement,
  icon: tier.icon,
  color: tier.color
}));

// Thêm các huy hiệu chuỗi ngày
BADGES.push(
  { id: 'streak_3', name: 'Chăm Chỉ', description: 'Học 3 ngày liên tục', type: 'streak', requirement: 3, icon: '🌱', color: 'bg-green-100 text-green-600' },
  { id: 'streak_7', name: 'Bền Bỉ', description: 'Học 7 ngày liên tục', type: 'streak', requirement: 7, icon: '🌲', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'streak_14', name: 'Đại Bàng', description: 'Học 14 ngày liên tục', type: 'streak', requirement: 14, icon: '🦅', color: 'bg-sky-100 text-sky-600' },
  { id: 'streak_30', name: 'Vô Địch', description: 'Học 30 ngày liên tục', type: 'streak', requirement: 30, icon: '🏆', color: 'bg-blue-100 text-blue-600' }
);

// Same "which badges has this score/streak earned" check needed by three different screens
// (the kids student picker, the parent's student cards, and the stats dashboard) — was
// copy-pasted at each call site.
export const getEarnedBadges = (totalScore: number, currentStreak: number) =>
  BADGES.filter((badge) => {
    if (badge.type === 'score' && totalScore >= badge.requirement) return true;
    if (badge.type === 'streak' && currentStreak >= badge.requirement) return true;
    return false;
  });

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

const exchangeSchema = z.object({
  studentId: z.string(),
  cost: z.number().int().min(1),
  itemName: z.string().min(1),
  // Sent explicitly by the frontend's store catalog instead of being guessed here by
  // pattern-matching itemName (e.g. "includes('15 phút')") — that broke silently the
  // moment the display text changed.
  minutes: z.number().int().min(1)
});

export const exchangePoints = async (req: Request, res: Response) => {
  try {
    const parsed = exchangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }
    const { studentId, cost, itemName, minutes } = parsed.data;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Atomic conditional decrement: only spends the points if the balance still covers
    // the cost at write time, so two rapid clicks / requests can't both succeed and drive
    // the score negative (a plain read-then-write would be racy here).
    const deduction = await prisma.student.updateMany({
      where: { id: studentId, totalScore: { gte: cost } },
      data: { totalScore: { decrement: cost } }
    });

    if (deduction.count === 0) {
      return res.status(400).json({ error: 'Not enough points' });
    }

    const updatedStudent = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });

    // Record PointExchange
    await prisma.pointExchange.create({
      data: {
        studentId,
        points: cost,
        minutes,
        status: 'PENDING'
      }
    });

    // Send Notification to parent
    await prisma.notification.create({
      data: {
        parentId: student.parentId,
        title: 'Yêu cầu đổi giờ chơi',
        message: `Bé ${student.name} đã dùng ${cost} điểm để đổi lấy ${itemName}. Bạn hãy vào xác nhận cho bé nhé!`
      }
    });

    res.json({ success: true, newTotalScore: updatedStudent.totalScore });
  } catch (error) {
    console.error('Exchange points error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
