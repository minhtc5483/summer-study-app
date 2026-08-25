import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const exams = await prisma.exam.findMany({
    include: {
      topic: true,
      students: true
    }
  })
  console.log("All exams:", JSON.stringify(exams, null, 2))
}
main()
