@echo off
echo ========================================================
echo Khoi dong phan mem On Luyen He (Test Mode)
echo ========================================================

echo.
echo [1/3] Kiem tra va cai dat thu vien (Dependencies)...
echo.
echo Cai dat Backend...
cd backend
call npm install
cd ..

echo.
echo Cai dat Frontend...
cd frontend
call npm install
cd ..

echo.
echo [2/3] Dang khoi dong Backend...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo [3/3] Dang khoi dong Frontend...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Hoan thanh!
echo Phan mem dang duoc khoi dong trong cac cua so moi.
echo Truy cap Frontend tai: http://localhost:5173
echo.
pause
