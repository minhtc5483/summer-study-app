const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const student = await prisma.student.findFirst();
  const exam = await prisma.exam.findFirst();
  const studentId = student.id;
  const examId = exam.id;
  const score = 100;
  const questionsAttempted = 10;
  const questionsCorrect = 10;
  const topicId = undefined; // Like in Quiz.tsx

  try {
    await prisma.studentProgress.upsert({
      where: {
        studentId_topicId: { studentId, topicId: topicId || 'default-topic-for-exam' }
      },
      update: {
        questionsAttempted: { increment: questionsAttempted },
        questionsCorrect: { increment: questionsCorrect },
        score: { increment: score }
      },
      create: {
        studentId,
        topicId: topicId || 'default-topic-for-exam',
        questionsAttempted,
        questionsCorrect,
        score
      }
    });
    console.log("Success");
  } catch (e) {
    console.error("Prisma error:", e.message);
  }
}
main();
