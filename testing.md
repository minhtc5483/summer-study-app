# Testing Rules

Sau mỗi lần chỉnh sửa source code, AI PHẢI thực hiện đầy đủ các bước sau trước khi kết thúc nhiệm vụ.

## 1. Build Project

Frontend

npm run build

Backend

npm run build (nếu có)

Không được bỏ qua bước này.

Nếu build lỗi:

- AI phải tự sửa.
- Build lại cho đến khi thành công.

Không được kết thúc khi còn lỗi build.

---

## 2. Chạy ứng dụng

Frontend

npm run dev

Backend

npm run server

Hoặc

npm start

Kiểm tra:

- Server khởi động thành công.
- Không có exception.
- Không có crash.

---

## 3. Kiểm tra Console

Không được còn:

ERROR

Unhandled Promise

TypeError

ReferenceError

React Error

Warning nghiêm trọng.

---

## 4. Kiểm tra Browser

Mở trang web.

Đảm bảo:

Trang chủ hiển thị.

Không màn hình trắng.

Không Loading vô hạn.

Không lỗi 404.

Không lỗi API.

---

## 5. Kiểm tra chức năng vừa sửa

Ví dụ:

Nếu sửa Login

→ phải login thử.

Nếu sửa Exam

→ phải làm thử một bài.

Nếu sửa Import

→ import thử.

Nếu sửa Dashboard

→ mở Dashboard.

---

## 6. Regression Test

Kiểm tra các chức năng cũ vẫn hoạt động.

Ví dụ

Login

Dashboard

Exam

Result

Parent

Student

Không được làm hỏng chức năng cũ.

---

## 7. Chỉ kết thúc khi

✓ Build thành công

✓ App chạy

✓ Không lỗi Console

✓ Không lỗi API

✓ Chức năng mới hoạt động

✓ Chức năng cũ vẫn hoạt động