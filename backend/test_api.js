const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const exams = await prisma.exam.findMany({
    include: {
      topic: true,
      students: true
    }
  });

  if (exams.length === 0) {
    console.log('No exams in DB');
    return;
  }

  const exam = exams[0];
  console.log('Found exam:', exam.name);
  console.log('Topic ID:', exam.topicId);
  console.log('Subject ID from topic:', exam.topic.subjectId);
  
  if (exam.students.length > 0) {
    console.log('Assigned to student:', exam.students[0].name, 'ID:', exam.students[0].id);
    
    // Simulate API query
    const subjectId = exam.topic.subjectId;
    const studentId = exam.students[0].id;
    
    const filter = {};
    filter.topic = { subjectId: subjectId };
    filter.students = { some: { id: studentId } };
    
    console.log('Filter:', JSON.stringify(filter, null, 2));
    
    const result = await prisma.exam.findMany({ where: filter });
    console.log('Query result length:', result.length);
  } else {
    console.log('Exam not assigned to any student.');
  }
}

main().catch(console.error);
