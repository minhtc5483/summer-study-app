const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.parent.create({
    data: { username: 'testuser', passwordHash: 'test' }
  });
  
  const subj = await prisma.subject.create({
    data: { name: 'Toán' }
  });

  const topic = await prisma.topic.create({
    data: { name: 'Topic 1', grade: 'Lớp 1', subjectId: subj.id }
  });

  const stud = await prisma.student.create({
    data: { name: 'Bin', grade: 'Lớp 1', parentId: p.id }
  });

  const exam = await prisma.exam.create({
    data: {
      name: 'Exam 1',
      topicId: topic.id,
      students: { connect: [{ id: stud.id }] }
    },
    include: { students: true }
  });

  console.log('Created exam with students:', exam.students.length);

  const filter = {
    topic: { subjectId: subj.id },
    students: { some: { id: stud.id } }
  };

  const results = await prisma.exam.findMany({ where: filter });
  console.log('Filtered results:', results.length);
}

main().catch(console.error);
