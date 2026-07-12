Quy tắc thực hiện

Chỉ thực hiện 01 task tại một thời điểm.

Không tự ý thay đổi chức năng khác ngoài task được giao.

Sau khi hoàn thành mỗi task bắt buộc phải:
Build project.
Chạy ứng dụng.
Kiểm tra chức năng vừa sửa.
Kiểm tra không làm hỏng chức năng cũ (Regression Test).
Chỉ chuyển sang task tiếp theo khi toàn bộ kiểm thử thành công.

EPIC 1 - Hệ thống cơ bản

T1. Xây dựng giao diện đăng nhập.
T2. Dashboard học sinh.
T3. Quản lý hồ sơ học sinh.
T4. Danh sách môn học.
T5. Màn hình làm bài.
T6. Màn hình kết quả.
T7. Dashboard phụ huynh.
T8. Import đề từ Excel.
T9. Import đề từ PDF.
T10. Trang thống kê.

EPIC 2 - Quản lý bài tập

T11. Sửa lỗi giao bài, học sinh phải nhìn thấy bài ngay sau khi được giao.
T12. Đề đã hoàn thành:
Hiển thị màu khác.
Hiển thị điểm đạt.
Đưa xuống cuối danh sách.
Ưu tiên đề chưa làm.
T13. Sau khi nộp bài:
Chỉ được xem lại.
Không được làm lại.
T14. Cho phép chỉnh sửa đề đã tạo.
T15. Tự động nộp bài khi đã trả lời hết.
T16. Thêm hạn hoàn thành cho đề.
EPIC 3 - Giao diện làm bài
T17. Đồng hồ đếm ngược với thanh tiến trình.
T18. Danh sách số câu hỏi:
Không dùng thanh cuộn.
Đã làm và chưa làm có màu khác.
T19. Câu nhập số:
Điện thoại chỉ hiện bàn phím số.

EPIC 4 - AI tạo đề

T20. Tạo đề nhanh bằng AI:
Chọn môn.
Chọn học sinh.
Số câu.
Thời gian.
AI lấy câu hỏi ngẫu nhiên.
T21. AI tạo đề theo:
Chủ đề.
Độ khó.
Hạn làm bài.
T22. AI tự tạo đề theo lịch hàng ngày.
T23. AI có thể tìm câu hỏi trên Internet và tạo đề bám sát chương trình học.

EPIC 5 - Hệ thống điểm thưởng

T24. Thiết kế lại hệ thống huy hiệu:
40 cấp.

Hiển thị tiến trình.
Định dạng điểm #,##0.
T25. Thưởng thêm điểm khi hoàn thành bài trước thời gian.
T26. Đổi điểm lấy thời gian sử dụng điện thoại.
T27. Phụ huynh xác nhận đổi thưởng và lưu lịch sử đổi điểm.

EPIC 6 - Thành tích & Thống kê

T28. Cập nhật thành tích học sinh theo thời gian thực.
T29. Dashboard phụ huynh cập nhật tức thì.
T30. Trang lịch sử tích điểm:
Ngày giờ.
Đề bài.
Điểm.
Số câu đúng.
Thời gian làm.
T31. Dashboard thống kê:
Theo ngày.
Theo môn.
Theo độ khó.
Đúng/Sai.
Thời gian hoàn thành.

EPIC 7 - Thông báo

T32. Thêm Notification Center.

Thông báo khi học sinh:

Hoàn thành bài.
Đạt điểm.
Thời gian làm.
Đổi thưởng.

EPIC 8 - Cải tiến giao diện

T33. Tối ưu avatar học sinh.
T34. Thiết kế lại giao diện học sinh:
Góc phần thưởng.
Nút đổi điểm.
Danh sách môn học dạng slide.
Danh sách đề theo hạn hoàn thành.
T35. Hiển thị toàn bộ đề của tất cả môn học, lọc theo môn.
T36. Thay đổi icon môn học bằng bộ icon phù hợp.
Quy tắc hoàn thành

Một task chỉ được đánh dấu hoàn thành khi:

Build thành công.
Không có lỗi TypeScript.
Không có lỗi Runtime.
Không có lỗi Console.
Responsive trên Mobile, Tablet và Desktop.
Chức năng mới hoạt động đúng.
Không làm hỏng chức năng cũ.
Đã tự kiểm thử trước khi bàn giao.