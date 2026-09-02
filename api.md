# API — Ôn Luyện Hè

Danh sách này được đối chiếu trực tiếp với `backend/src/routes.ts` — không phải tổng hợp thủ công. Nếu thêm/sửa route, cập nhật file này trong cùng commit.

**Base URL**: `/api` (cùng origin với frontend khi chạy qua Express static/PM2; khi dev bằng `vite`, Vite proxy `/api` sang backend — xem `frontend/vite.config.ts`).

**Reverse proxy production**: Cloudflare Tunnel → Raspberry Pi cổng **3001** (không phải 3000 — cổng 3000 trên Pi bị một Docker container khác chiếm, xem chú thích trong `ecosystem.config.js`).

## Ký hiệu quyền truy cập
- 🌐 **Công khai** — không cần token.
- 👪 **Phụ huynh** — cần JWT (`Authorization: Bearer <accessToken>` từ `/auth/login`).
- 🔒 **Phụ huynh + PIN quản lý** — như trên, và cần thêm header `X-Manage-Token` (từ `/auth/manage-pin/verify`) nếu tài khoản đã đặt PIN quản lý.
- 🧒 **Khu bé** — cần `Authorization: Bearer <kidsAccessToken>` từ `/public/students/:id/verify-pin`. Token này gắn với đúng `studentId` đã xác thực PIN; dùng cho `studentId` khác sẽ bị từ chối (401).

---

## Auth (`/auth`)
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| POST | `/auth/register` | 🌐 (rate-limited) | Cần `inviteCode` khớp `REGISTER_INVITE_CODE` |
| POST | `/auth/login` (alias: `POST /login`) | 🌐 (rate-limited) | |
| POST | `/auth/refresh` | 🌐 (rate-limited riêng) | Refresh token dùng một lần (rotation) — token cũ bị từ chối sau khi đã refresh |
| GET | `/auth/me` | 👪 | |
| GET | `/auth/manage-pin` | 👪 | Trả `{ hasPin }` |
| PUT | `/auth/manage-pin` | 👪 | Cần `password` hiện tại để đặt/đổi/xoá PIN |
| POST | `/auth/manage-pin/verify` | 👪 (rate-limited) | Trả `manageToken` dùng cho `X-Manage-Token` |
| PUT | `/auth/password` | 🔒 (rate-limited) | Cần `currentPassword` |

## Học sinh (`/students`)
| Method | Path | Quyền |
|---|---|---|
| GET | `/students` | 🔒 |
| POST | `/students` | 🔒 (multipart, field `avatar`) |
| PUT | `/students/:id` | 🔒 (multipart) |
| PUT | `/students/:id/pin` | 🔒 |
| DELETE | `/students/:id` | 🔒 |

## Khối lớp & Môn học (`/grades`, `/subjects`, `/topics`)
| Method | Path | Quyền |
|---|---|---|
| GET / POST | `/grades` | 🔒 |
| DELETE | `/grades/:id` | 🔒 |
| GET / POST | `/subjects` | 🔒 |
| PUT / DELETE | `/subjects/:id` | 🔒 |
| GET / POST | `/topics` | 🔒 |
| POST | `/topics/suggest` | 🔒 (rate-limited riêng, gọi Gemini) |

## Đề thi (`/exams`)
Đăng ký route literal (`/exams/ai-schedules`, `/exams/quick-create`, `/exams/jobs/:id`) **phải** nằm trước `/exams/:id` — nếu không Express sẽ khớp nhầm chúng vào tham số `:id`.

| Method | Path | Quyền |
|---|---|---|
| GET | `/exams` | 🔒 |
| POST | `/exams` | 🔒 |
| POST | `/exams/quick-create` | 🔒 — trả `{ jobId }` ngay, tạo đề chạy nền (tránh timeout 100s của Cloudflare Tunnel) |
| GET | `/exams/jobs/:id` | 🔒 — poll trạng thái job trên |
| POST / GET / DELETE | `/exams/ai-schedules[...]` | 🔒 |
| GET / PUT / DELETE | `/exams/:id` | 🔒 |

## Câu hỏi & Nhập liệu
| Method | Path | Quyền |
|---|---|---|
| GET | `/questions` | 🔒 |
| POST | `/questions` | 🔒 — `content` được validate đúng hình dạng (text/options/correct) |
| POST | `/import` | 🔒 — nhập CSV, bỏ qua câu trùng |
| POST | `/import-pdf` | 🔒 (multipart) — AI đọc ảnh/PDF thành câu hỏi |
| POST | `/export` | 🔒 — xuất toàn bộ dữ liệu của phụ huynh ra JSON |

## Bài làm & Thống kê
| Method | Path | Quyền |
|---|---|---|
| POST | `/submit` (alias cũ: `/progress`) | 🔒 — chấm lại điểm ở server, không tin điểm client gửi |
| GET | `/statistics` | 🔒 |
| GET | `/statistics/activity-log` | 🔒 |
| GET | `/statistics/students/:studentId/details` | 🔒 |
| GET | `/statistics/exam-results/:id` | 🔒 — chi tiết đúng/sai từng câu của một lượt nộp bài |

## Thưởng & Đổi điểm
| Method | Path | Quyền |
|---|---|---|
| GET | `/rewards/:studentId` | 🔒 |
| GET | `/point-exchanges` | 🔒 |
| PUT | `/point-exchanges/:id/fulfill` | 🔒 |

## Thông báo
| Method | Path | Quyền |
|---|---|---|
| GET | `/notifications` | 🔒 |
| PUT | `/notifications/:id/read` | 🔒 — `:id` có thể là `"all"` |

## Khu bé (`/public/*`)
Màn "chọn bé" gọi `GET /public/students` trước khi có token nào — chỉ hiện tên/avatar/huy hiệu, không lộ PIN.

| Method | Path | Quyền |
|---|---|---|
| GET | `/public/students` | 🌐 |
| POST | `/public/students/:studentId/verify-pin` | 🌐 (rate-limited) — trả `accessToken` gắn với `studentId` này |
| POST | `/public/verify-pin` | 🌐 (rate-limited) — PIN gia đình cũ (legacy), token trả về **không** gắn với một bé cụ thể |
| GET | `/public/students/:studentId/history` | 🧒 |
| GET | `/public/exams` | 🧒 — `studentId` là query param tùy chọn |
| GET | `/public/exams/:id` | 🧒 — `studentId` là query param tùy chọn |
| POST | `/public/submit` | 🧒 |
| GET | `/public/rewards/:studentId` | 🧒 |
| POST | `/public/exchange-points` | 🧒 |
