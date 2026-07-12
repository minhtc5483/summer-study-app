import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    const id = req.params.id as string;
    
    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { parentId, isRead: false },
        data: { isRead: true }
      });
    } else {
      await prisma.notification.update({
        where: { id, parentId },
        data: { isRead: true }
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
