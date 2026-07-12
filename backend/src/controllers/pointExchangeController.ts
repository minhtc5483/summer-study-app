import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';

// Lấy danh sách yêu cầu đổi điểm của các bé thuộc phụ huynh này
export const getExchanges = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    
    // Tìm các bé của phụ huynh
    const students = await prisma.student.findMany({
      where: { parentId },
      select: { id: true }
    });
    const studentIds = students.map(s => s.id);

    const exchanges = await prisma.pointExchange.findMany({
      where: { studentId: { in: studentIds } },
      include: { student: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(exchanges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Phê duyệt đã cho bé chơi
export const fulfillExchange = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const exchange = await prisma.pointExchange.update({
      where: { id },
      data: { status: 'FULFILLED' }
    });

    res.json(exchange);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
