import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth';
import { generateAiExam, toParentFacingError } from '../services/aiExamService';

// "Tạo Đề Nhanh AI" used to do the whole Gemini round-trip inside the HTTP request. On the
// public domain that request goes through Cloudflare Tunnel, which gives up on the origin
// after 100 seconds and returns 524 — and the browser only ever saw a generic failure even
// though the exam was often still being written. Now the request just files a job and
// returns immediately; the work happens here and the page polls GET /exams/jobs/:id.

const quickCreateSchema = z.object({
  subjectId: z.string(),
  topicId: z.string().optional().nullable(),
  studentIds: z.array(z.string()).min(1),
  numberOfQuestions: z.number().int().min(1).max(50),
  timeLimit: z.number().int().min(1).optional(),
  dueDate: z.string().optional().nullable(),
  useInternetSearch: z.boolean().optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
});

type QuickCreateParams = z.infer<typeof quickCreateSchema>;

async function runJob(jobId: string, params: QuickCreateParams) {
  try {
    await prisma.aiExamJob.update({ where: { id: jobId }, data: { status: 'RUNNING' } });

    const exam = await generateAiExam(
      params.subjectId,
      params.studentIds,
      params.numberOfQuestions,
      params.timeLimit,
      params.dueDate ? new Date(params.dueDate) : null,
      params.topicId,
      params.useInternetSearch,
      params.difficulty
    );

    await prisma.aiExamJob.update({
      where: { id: jobId },
      data: { status: 'DONE', examId: exam.id, examName: exam.name },
    });
  } catch (error: any) {
    console.error(`[AiExamJob ${jobId}] failed:`, error);
    await prisma.aiExamJob
      .update({
        where: { id: jobId },
        data: { status: 'FAILED', error: toParentFacingError(error).message },
      })
      .catch((err) => console.error(`[AiExamJob ${jobId}] could not record failure:`, err));
  }
}

export const enqueueQuickCreateExam = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = quickCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const job = await prisma.aiExamJob.create({
      data: {
        parentId: req.user!.id,
        status: 'PENDING',
        params: JSON.stringify(parsed.data),
      },
    });

    // Deliberately not awaited: the response goes out now, the generation continues after it.
    void runJob(job.id, parsed.data);

    res.status(202).json({ jobId: job.id, status: job.status });
  } catch (error) {
    console.error('Enqueue AI exam job error:', error);
    res.status(500).json({ error: 'Không tạo được yêu cầu tạo đề. Vui lòng thử lại.' });
  }
};

export const getAiExamJob = async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.aiExamJob.findUnique({ where: { id: req.params.id as string } });

    if (!job || job.parentId !== req.user!.id) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu tạo đề này.' });
    }

    res.json({
      id: job.id,
      status: job.status,
      examId: job.examId,
      examName: job.examName,
      error: job.error,
      createdAt: job.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Jobs only live in this process's memory once started, so a restart (pm2 reload, deploy,
// power cut on the Pi) would otherwise leave rows stuck on PENDING/RUNNING forever and the
// page polling them would spin indefinitely. Fail them at boot instead.
export const failInterruptedAiExamJobs = async () => {
  const { count } = await prisma.aiExamJob.updateMany({
    where: { status: { in: ['PENDING', 'RUNNING'] } },
    data: { status: 'FAILED', error: 'Máy chủ khởi động lại giữa chừng. Bạn bấm tạo đề lại nhé.' },
  });
  if (count > 0) {
    console.log(`[AiExamJob] marked ${count} interrupted job(s) as failed on startup`);
  }
};
