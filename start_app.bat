@echo off
echo ========================================================
echo Khởi động Web App Ôn Luyện Hè Lớp 1 & 2
echo ========================================================

echo.
echo [1/2] Đang khởi động Backend (chạy trên cổng 3000)...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo [2/2] Đang khởi động Frontend (chạy trên cổng 5173)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Hoàn thành! 
echo Frontend đang mở ở cửa sổ mới, bạn có thể truy cập: http://localhost:5173
echo.
pause
