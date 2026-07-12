const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const parent = await prisma.parent.findFirst();
    if (!parent) return console.log("No parent");
    const students = await prisma.student.findMany({
      where: { parentId: parent.id },
      include: {
        progress: { include: { topic: true } },
        wrongQuestions: { include: { question: { include: { topic: true } } } }
      }
    });
    console.log("Students:", students.length);
  } catch (e) { console.error(e); }
}
main();
