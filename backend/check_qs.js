const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

prisma.question.findMany({ take: 5 }).then(qs => {
  console.log(qs.map(q => q.content));
}).catch(e => console.error(e)).finally(() => prisma.$disconnect());
