# Cấu trúc thư mục thực tế

(Trước đây file này mô tả một cấu trúc dự kiến — `components/`, `hooks/`, `services/`, `types/`, `utils/` — chưa từng khớp với code thật. Đây là cây thư mục thực tế, đối chiếu trực tiếp với repo.)

## backend/

```
backend/
  prisma/
    schema.prisma       # Định nghĩa toàn bộ model + migrate qua `prisma db push`
  src/
    controllers/        # Một file mỗi nhóm resource (authController, studentController, ...)
    middlewares/         # auth (JWT phụ huynh), manageAccess (PIN quản lý), kidsAccess (token khu bé), rateLimit, upload
    services/            # Logic nghiệp vụ tách khỏi controller (vd. aiExamService.ts gọi Gemini)
    lib/                  # Tiện ích dùng chung
    routes.ts            # Toàn bộ route — nguồn sự thật duy nhất, đối chiếu api.md với file này
    cron.ts              # Job AI giao đề tự động 06:00 hằng ngày
    index.ts             # Khởi tạo Express, CORS, static, dotenv
  uploads/               # Ảnh đại diện đã xử lý qua sharp (.webp) — không commit vào git
```

## frontend/

```
frontend/
  src/
    pages/
      parent/            # Toàn bộ màn quản lý phụ huynh (mỗi màn/modal một file .tsx)
      kids/               # Toàn bộ màn khu bé (chọn môn, làm bài, đổi thưởng)
      Home.tsx, Login.tsx, ParentDashboard.tsx, App.tsx
    store/                # Zustand: useAuthStore, useStudentStore, useKidsAccessStore, useManageAccessStore
    lib/                  # api.ts (axios + interceptor refresh token), các hàm tiện ích dùng chung
    assets/
    main.tsx              # Định nghĩa route bằng react-router
```

Không có `components/` dùng chung tách riêng — mỗi trang trong `pages/parent` hoặc `pages/kids` là một component độc lập, đôi khi khá lớn (xem `coding-rules.md` về giới hạn 300 dòng — một số file hiện đang vượt, chưa tách).
