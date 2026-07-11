import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const exams = await prisma.exam.findMany({
    include: {
      topic: true,
      students: true
    }
  })
  console.dir(exams, { depth: null });
  
  if (exams.length > 0) {
    const exam = exams[0];
    const subjectId = exam.topic.subjectId;
    const studentId = exam.students.length > 0 ? exam.students[0].id : null;
    console.log('Testing with subjectId:', subjectId, 'studentId:', studentId);
    
    if (studentId) {
      const filtered = await prisma.exam.findMany({
        where: {
          topic: { subjectId: subjectId },
          students: { some: { id: studentId } }
        },
        include: {
          topic: true,
          students: true
        }
      });
      console.log('Filtered length:', filtered.length);
    }
  }
}
main()
