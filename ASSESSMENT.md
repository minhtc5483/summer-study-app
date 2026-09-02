# Đánh giá dự án — Web App Ôn Luyện Hè Lớp 1-2-3

> Đánh giá toàn bộ mã nguồn & tài liệu của dự án (backend Express/TS/Prisma, frontend React/Vite/TS, deploy scripts, docs).
> Ngày: 2026-09-02. Mức độ: 🔴 Nghiêm trọng · 🟠 Cao · 🟡 Trung bình · 🟢 Thấp/Cải tiến.

---

## Cập nhật 2026-09-02 (sau khi đối chiếu và sửa)

Đã đối chiếu từng mục với code thật (không tin theo báo cáo mù quáng) trước khi sửa. Kết quả:

**Đã sửa và test kỹ, đã deploy**: 2.1, 2.2, 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 4.5, 4.6, 5.2, 5.3, 5.4 (một phần — xem dưới), 5.6 (một phần), 6.1, 6.4, 6.5. Đã thêm bộ test tự động đầu tiên (`npm test` ở backend) cho 5.1 — mới cover logic streak, chưa phải full coverage.

**Xác nhận là SAI / không phải bug thật** (không sửa vì không có gì để sửa):
- 3.4 — `accuracyData[0]` không thể undefined, backend luôn trả mảng 2 phần tử cố định.
- 3.5 — `markAsRead('all')` đã được backend xử lý đúng từ trước.
- 5.5 — TypeScript `^7.0.2`/`~6.0.2` là các bản thật đã cài đặt và chạy ổn suốt dự án, không phải lỗi.
- 5.6 (dòng "Hằng ngày lúc 06:00") — đúng sự thật, cron job thật sự cố định 06:00 cho mọi lịch, không phải hardcode sai.

**Cố ý CHƯA làm** (rủi ro hồi quy cao nếu làm vội, cần một phiên riêng có thời gian test kỹ hơn):
- 4.1 — bỏ toàn bộ `any` (~25 file).
- 4.2 — tách mọi file >300 dòng (Quiz.tsx, Overview.tsx, Settings.tsx, ...).
- 6.2/6.3 — đã xoá `deploy.bat` (nguy hiểm, không dùng) thay vì hợp nhất; `deploy-to-pi.bat` là đường triển khai chính thức duy nhất còn lại.
- 4.4 — vẫn còn `run.bat` + `deploy-to-pi.bat` (đã xoá 2 file `.bat` thừa/nguy hiểm) vì máy dev là Windows, chưa chuyển hẳn sang npm scripts/PowerShell.

---

## 1. Tổng quan

Dự án là ứng dụng giáo dục cho trẻ 6-8 tuổi (làm bài theo từng câu, gamification) + dashboard phụ huynh, deploy trên Raspberry Pi qua Cloudflare Tunnel. Kiến trúc tổng thể **khá tốt và nhất quán**:

- **Backend**: Express 5 + Prisma (SQLite) + zod + jsonwebtoken + bcryptjs + multer + sharp + node-cron + `@google/genai`. Cấu trúc rõ ràng, async/await nhất quán, try/catch đầy đủ, re-grade submission ở server (chống gian lận client), job-queue cho AI, reconcile job khi restart.
- **Frontend**: React 19 + Vite + Tailwind v4 + Zustand + axios. Routing hợp lý, `api.ts` có interceptor refresh token tốt, `baseURL: '/api'` relative (chuẩn cho prod).
- **Tài liệu**: Rất nhiều file `.md` (project, features, rules, testing...). Ý tưởng tốt nhưng **thiếu đồng bộ với thực tế** (xem §6).

**Điểm sáng**: xử lý CORS same-origin cẩn thận, `trust proxy` đúng, re-grade server-side, guard mảng một phần ở frontend, a11y cơ bản trên notification.

---

## 2. 🔴 Vấn đề nghiêm trọng (sửa ngay)

### 2.1 IDOR — token truy cập Kids không gắn `studentId` (lỗ hổng bảo mật lớn)
- `backend/src/middlewares/kidsAccess.ts:18-20` phát hành token `{ scope: 'kids-public' }` **không chứa studentId**.
- Mọi route `/public/*` (routes.ts) chỉ kiểm tra scope, không kiểm tra quyền sở hữu.
- `kidsAccessController.ts:48-49`: học sinh **chưa đặt PIN** (`pinHash === null`) được cấp token ngay lập tức, không cần PIN.
- Hậu quả: bất kỳ ai có token đều có thể:
  - `POST /public/submit` với `studentId` bất kỳ → **sửa điểm học sinh khác** (progressController.ts:249-257).
  - `POST /public/exchange-points` → **tiêu điểm của học sinh khác** (rewardController.ts:108-143).
  - `GET /public/rewards/:id`, `/history` → **lấy tên/điểm/lịch sử học sinh khác**.
- Token còn `expiresIn: '180d'` (6 tháng) → cửa sổ tấn công rất dài.

**Sửa**: gắn `studentId` (và có thể `role`) vào payload token; verify `studentId` khớp trên TẤT CẢ route `/public/*`; không cấp token nếu học sinh chưa đặt PIN (trừ khi là thiết kế có chủ đích thì phải cách ly dữ liệu theo student); rút ngắn thời hạn token.

### 2.2 UI vi phạm nghiêm trọng quy tắc thiết kế trẻ em (màu đỏ khi làm sai)
- `ui-design.md`: *"Không dùng màu đỏ khi bé làm sai"*.
- `frontend/src/pages/kids/Quiz.tsx` dùng `red-100/red-500/red-800` cho đáp án sai: dòng **365, 366, 395, 438, 523, 528**.
- **Sửa**: thay bằng tông trung tính/ấm (vàng cam chủ đạo của app), copy nhẹ nhàng ("Thử lại nhé").

---

## 3. 🟠 Cao (bảo mật & đúng-sai)

3.1 **`/auth/refresh` không có rate-limit, token sống 7 ngày, không thu hồi/xoay vòng** → replayable. Thêm `authRateLimit`, single-use rotation, deny-list.
3.2 **Upload file (multer)** chỉ validate `mimetype`, phục vụ static (`index.ts:69`) → SVG giả mạo → **stored XSS**. Giới hạn raster thật, verify magic bytes qua `sharp`, không serve SVG.
3.3 **Question `content` là `z.any()`** (`questionController.ts:35,69`, `progressController.ts:8`) → JSON không validate, lưu rồi trả client → XSS nếu frontend render. Validate hình dạng câu hỏi bằng zod.
3.4 **`StudentDetailStats.tsx:171`** `data.accuracyData[0].value` không guard → **crash màn hình trắng** khi `accuracyData` undefined/rỗng (dòng 99, 145 đã guard).
3.5 **`ParentDashboard.tsx:204`** `markAsRead('all')` gọi `PUT /notifications/all/read` (id không hợp lệ) → server 404 bị swallow nhưng UI optimistic mark-all → chức năng "đánh dấu đã đọc tất cả" **không lưu**.
3.6 **`computeStreak` dùng `Math.abs(diffTime)`** (`progressController.ts:120`) → ngày lùi vẫn tính liên tiếp. Dùng diff có dấu.
3.7 **`studentController.ts:61`** `correctAnswers = Math.round(er.score/10)` sai khi điểm không đều / có time-bonus.
3.8 **AI tạo đề không transactional** (`aiExamService.ts:156-168`) → nếu `exam.create` lỗi sẽ để lại câu hỏi mồ côi. Bọc `prisma.$transaction`.

---

## 4. 🟡 Trung bình (vi phạm quy tắc dự án)

Dự án có `coding-rules.md` rất rõ nhưng **nhiều chỗ chưa tuân thủ**:

4.1 **Dùng `any` tràn lan** — vi phạm "Không dùng any". Backend: `aiExamService`, `examController`, `questionController`, `statisticsController` (312 dòng), `studentController`, `rewardController`, `topicController`. Frontend: 19+ chỗ (`Login`, `Quiz`, `Overview`, `StudentDetailStats`, `QuestionBank`, `ImportModal`, `CreateExamModal`, `QuickCreateExamModal`, `ManagePinGate`, `Settings`, `Students`, `ChangePasswordCard`). `.oxlintrc.json` **chưa bật `no-explicit-any`**.
4.2 **File > 300 dòng** — vi phạm "Không viết file trên 300 dòng": backend `statisticsController.ts` (312), `progressController.ts` (302); frontend `Quiz.tsx` (576), `Overview.tsx` (555), `Settings.tsx` (495), `QuickCreateExamModal.tsx` (439), `QuestionBank.tsx` (411), `KidsHome.tsx` (340), `ImportModal.tsx` (334), `CreateExamModal.tsx` (318).
4.3 **File `.js` dù quy tắc "Không dùng JavaScript"**: `backend/scripts/debug/*.js` + `read_transcript.js` (còn **hardcode `C:\` path** — vi phạm kép "Không hardcode ổ đĩa C:").
4.4 **Trái ngược quy tắc "Không dùng Batch"**: có tới **4 file `.bat`** (`deploy.bat`, `deploy-to-pi.bat`, `run.bat`, `start_app.bat`).
4.5 **Hardcode `localhost:3000`** ở `frontend/vite.config.ts` (proxy) và dev — vi phạm "Mọi cấu hình nằm trong file .env". Đưa proxy target vào `.env`.
4.6 **Thiếu validation zod** ở `gradeController.createGrade`, `subjectController.createSubject`, `subjectController.updateSubject` → vi phạm "Mọi API phải có validation".

---

## 5. 🟢 Thấp / Vệ sinh mã & cấu hình

5.1 **Không có test nào** (`test` script `exit 1`) — trái tinh thần `testing.md` / `efinition-of-done.md`.
5.2 **Dead dependencies**: backend `@google/generative-ai` (không import, chỉ `@google/genai`), `nodemon` (dùng `tsx`). Frontend cài `react-query`, `react-hook-form`, `zod` **nhưng không import** — fetching thủ công bằng polling `setInterval` (3s/5s/10s) thay vì cache. Quy tắc "mọi API phải có validation" không enforce vì form chỉ dùng HTML `required`.
5.3 **Trùng lặp**: badge compute lặp (`studentController`, `statisticsController`, `rewardController`); `ExamCard`/mảng `colors` lặp ở `KidsHome` & `SubjectExams`. Extract helper/component chung.
5.4 **Rác cần dọn**: `backend/scripts/debug/*` (seed/test/thử), `dev.db.unused_backup` (binary), `frontend/src/assets/react.svg`+`vite.svg` (boilerplate Vite), `frontend/README.md` (template mặc định).
5.5 **Version drift TypeScript**: backend `^7.0.2`, frontend `~6.0.2`. TS 7/6 **không tồn tại bản stable** (thực tế 5.x) → rủi ro `npm install`/`build` lỗi. Pin bản ổn định (5.x) cho cả 2. `@types/node` ^26 vs ^24 (nhỏ).
5.6 **Sai sót logic nhỏ khác**: `Overview.tsx:374` hardcode "Hằng ngày lúc 06:00" bất kể schedule; `Quiz.tsx:43-45` sound từ external `mixkit.co` (lỗi khi offline/kiosk); `KidsHome.tsx:55` `selectedSubjectId === null` là dead code.
5.7 **CORS**: cho phép request **không có Origin header** — chấp nhận với token Bearer nên CSRF hạn chế, nhưng nên cân nhắc lại với các POST state-changing.

---

## 6. Tài liệu & Deploy (cần đồng bộ)

6.1 **README ghi backend port 3000**, nhưng **prod chạy 3001** (`ecosystem.config.js` ở root, do port 3000 bị Docker `flowtask-api-1` chiếm). README/api.md chưa cập nhật → dễ nhầm.
6.2 **Hai cơ chế deploy mâu thuẫn**: `deploy.bat` (git push → ssh `git reset --hard` + `npx tsx seed.ts`, hardcode IP `192.168.10.121`) và `deploy-to-pi.bat` (robocopy + scp). Nên chuẩn hóa 1 đường đi.
6.3 `deploy.bat` reference `seed.ts` không đúng path (thực tế ở `backend/scripts/debug/seed.ts`) và `git reset --hard HEAD` có rủi ro mất thay đổi local.
6.4 `api.md` chưa cập nhật endpoint thực tế (`/auth/refresh`, `/notifications`, `/exchange-points`...). `folder-structure.md` mô tả cũ không khớp `src/controllers`, `src/services`.
6.5 README cuối có đoạn lặp/garbled ("Cài NodeJS / Clone source / npm install...").
6.6 Khi deploy prod, **nhớ cập nhật Cloudflare Tunnel Public Hostname target thành 3001** (ghi chú trong `ecosystem.config.js` nhưng dễ quên).

> Lưu ý đã xác minh: `prisma/dev.db` **đã được gitignore** (root `.gitignore` có `*.db`) và `.env` cũng được ignore — không phải vấn đề như một báo cáo phụ gợi ý. `ecosystem.config.js` **tồn tại** ở root (PORT 3001).

---

## 7. Khuyến nghị ưu tiên (thứ tự sửa)

| # | Việc | Mức | Nỗ lực |
|---|------|-----|--------|
| 1 | Gắn `studentId` vào kids-access token + verify trên mọi `/public/*` (2.1) | 🔴 | TB |
| 2 | Bỏ màu đỏ khi sai trong `Quiz.tsx` (2.2) | 🔴 | Thấp |
| 3 | Rate-limit + rotation `/auth/refresh`; rút ngắn token (3.1) | 🟠 | TB |
| 4 | Khóa upload (chỉ raster + magic bytes, không serve SVG) + validate `content` (3.2-3.3) | 🟠 | TB |
| 5 | Guard `StudentDetailStats.tsx:171` + sửa `markAsRead('all')` (3.4-3.5) | 🟠 | Thấp |
| 6 | Bật `no-explicit-any` trong oxlint + dọn `any`, tách file >300 dòng (4.1-4.2) | 🟡 | Cao |
| 7 | Xóa `.js` debug + `read_transcript.js`, gom logic deploy, xóa `.bat` hoặc hợp nhất (4.3-4.4) | 🟡 | TB |
| 8 | Đưa proxy port vào `.env`; thêm zod cho grade/subject (4.5-4.6) | 🟡 | Thấp |
| 9 | Pin TypeScript 5.x; xóa dead deps; thêm test cơ bản (5.1-5.5) | 🟢 | TB |
| 10 | Đồng bộ README/api.md/folder-structure.md với thực tế deploy (6.x) | 🟢 | Thấp |

**Tóm lại**: kiến trúc nền tảng tốt, nhưng có **1 lỗ hổng bảo mật nghiêm trọng (IDOR kids-access)** và **1 vi phạm thiết kế trẻ em (màu đỏ)** cần sửa ngay. Sau đó là việc **tuân thủ bộ quy tắc đã tự đặt ra** (any, 300 dòng, không JS/Batch, config vào .env) và dọn dẹp vệ sinh mã.
