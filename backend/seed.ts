import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function main() {
  const username = 'admin';
  const password = '123';

  const existingUser = await prisma.parent.findUnique({ where: { username } });
  
  if (!existingUser) {
    await prisma.parent.create({
      data: {
        username,
        passwordHash: hashPassword(password),
      },
    });
    console.log('Tạo tài khoản thành công!');
  } else {
    console.log('Tài khoản admin đã tồn tại.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
