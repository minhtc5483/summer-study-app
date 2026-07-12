import cron from 'node-cron';
import { prisma } from './index';
import { generateAiExam } from './services/aiExamService';

// Chạy vào lúc 06:00 mỗi sáng
cron.schedule('0 6 * * *', async () => {
  console.log('--- Starting Daily AI Exam Generation ---');
  
  try {
    const schedules = await prisma.aiExamSchedule.findMany({
      where: { isActive: true }
    });

    for (const schedule of schedules) {
      try {
        const studentIds = JSON.parse(schedule.studentIds) as string[];
        if (studentIds.length === 0) continue;

        // Tính toán dueDate
        let dueDate: Date | null = null;
        if (schedule.dueDays) {
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + schedule.dueDays);
        }

        await generateAiExam(
          schedule.subjectId,
          studentIds,
          schedule.numberOfQuestions,
          schedule.timeLimit,
          dueDate,
          schedule.topicId,
          schedule.useInternetSearch,
          schedule.difficulty !== null ? schedule.difficulty : undefined
        );
        
        console.log(`[Success] Generated AI Exam for schedule ${schedule.id}`);
      } catch (err) {
        console.error(`[Error] Failed to generate AI Exam for schedule ${schedule.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error fetching schedules:', err);
  }
  
  console.log('--- Finished Daily AI Exam Generation ---');
});
