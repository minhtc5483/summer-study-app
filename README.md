# Web App Ôn Luyện Hè Lớp 1 & 2

Dự án này là một ứng dụng web giáo dục dành cho trẻ em lớp 1 và lớp 2 ôn luyện trong dịp hè, với giao diện thân thiện, nút bấm lớn, và gamification.
Cung cấp dashboard cho phụ huynh để quản lý học sinh và nhập câu hỏi nhanh.

## Yêu cầu hệ thống
- Node.js >= 18
- npm

## Cấu trúc thư mục
- `backend/`: Node.js, Express, Prisma, SQLite
- `frontend/`: React, Vite, TailwindCSS v4, Framer Motion, Zustand

## Hướng dẫn Cài đặt & Chạy dự án

### 1. Khởi tạo Backend
Mở một terminal và chạy các lệnh sau:
```bash
cd backend
npm install
# Khởi tạo database SQLite và chạy migration
npx prisma db push
# Khởi động server
npm run dev
```
Backend sẽ chạy tại `http://localhost:3000`

### 2. Khởi tạo Frontend
Mở một terminal MỚI và chạy các lệnh sau:
```bash
cd frontend
npm install
# Khởi động ứng dụng React
npm run dev
```
Frontend sẽ chạy tại `http://localhost:5173`

## Các tính năng chính (Phiên bản MVP)
- **Kiến trúc DB:** SQLite với Prisma, dễ dàng scale lên PostgreSQL.
- **Backend API:** Đầy đủ CRUD cho Phụ huynh, Học sinh, Môn học, Câu hỏi.
- **Frontend Kids App:** Giao diện bắt mắt, animations mượt mà bằng Framer Motion, cơ chế hiển thị 1 câu/lần không gây áp lực.
- **Frontend Parent Dashboard:** Giao diện quản lý gọn gàng.

## Hướng dẫn cài đặt PWA (Tương lai)
Dự án được cấu hình bằng Vite. Để biến thành PWA, hãy cài plugin `vite-plugin-pwa` và thêm file `manifest.json`. Kiến trúc hiện tại đã hoàn toàn tách biệt frontend và backend để hỗ trợ tốt nhất cho PWA.


Cài NodeJS

Clone source

npm install

npm run build

npm run server

pm2 start ecosystem.config.js

pm2 save

pm2 startup
