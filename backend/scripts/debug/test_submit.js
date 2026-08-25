const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const student = await prisma.student.findFirst();
  if (!student) { console.log("No student"); return; }
  const exam = await prisma.exam.findFirst();
  if (!exam) { console.log("No exam"); return; }
  console.log("studentId:", student.id, "examId:", exam.id);
  
  try {
    const res = await fetch('http://localhost:3000/api/public/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: student.id,
        examId: exam.id,
        score: 100,
        questionsAttempted: 10,
        questionsCorrect: 10,
      })
    });
    console.log(res.status, await res.text());
  } catch (e) { console.error(e); }
}
main();
