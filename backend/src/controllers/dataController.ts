import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';

export const exportData = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.id;
    
    // Export all data related to the parent
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          include: {
            progress: true,
            wrongQuestions: true
          }
        }
      }
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=export.json');
    res.json(parent);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
