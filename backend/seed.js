"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
const hashPassword = (password) => {
    return crypto_1.default.createHash('sha256').update(password).digest('hex');
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
    }
    else {
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
//# sourceMappingURL=seed.js.map