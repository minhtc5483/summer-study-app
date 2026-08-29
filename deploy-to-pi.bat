@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM  Cau hinh - sua o day neu can
REM ============================================
set PI_USER=pi
set PI_HOST=192.168.10.121
set PI_DEST=~/summer-study-app
set PM2_NAME=summer-study-app

set LOCAL_SRC=%~dp0
set STAGING=%TEMP%\summer-study-app-deploy

echo ============================================
echo   Copy Summer Study App len Raspberry Pi
echo   Pi: %PI_USER%@%PI_HOST%
echo ============================================
echo.

where scp >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay lenh "scp".
    echo Vao Settings ^> Apps ^> Optional features ^> them "OpenSSH Client" roi thu lai.
    pause
    exit /b 1
)

REM 1. Don code vao thu muc tam, loai bo nhung thu khong nen copy
if exist "%STAGING%" rmdir /s /q "%STAGING%"
mkdir "%STAGING%"

echo Dang chuan bi file...
robocopy "%LOCAL_SRC%backend" "%STAGING%\backend" /E /R:2 /W:2 /XD node_modules dist .git debug uploads /XF dev.db >nul
robocopy "%LOCAL_SRC%frontend" "%STAGING%\frontend" /E /R:2 /W:2 /XD node_modules dist .git >nul

echo.
echo Dang copy len Pi (se hoi mat khau SSH cua Pi)...
echo.

scp -r "%STAGING%\backend" %PI_USER%@%PI_HOST%:%PI_DEST%/
if errorlevel 1 goto :copyfail

scp -r "%STAGING%\frontend" %PI_USER%@%PI_HOST%:%PI_DEST%/
if errorlevel 1 goto :copyfail

echo.
echo ============================================
echo   Copy xong!
echo ============================================
echo.

set /p RUNBUILD="Ban co muon SSH vao Pi de tu dong npm install + build + restart luon khong? (y/n): "
if /i "%RUNBUILD%"=="y" (
    echo.
    echo Dang chay tren Pi, se hoi mat khau them 1 lan...
    ssh %PI_USER%@%PI_HOST% "cd %PI_DEST%/backend && npm install && npx prisma db push && npm run build && cd %PI_DEST%/frontend && npm install && npm run build && pm2 restart %PM2_NAME%"
    if errorlevel 1 (
        echo.
        echo [LOI] Buoc build/restart tren Pi bi loi. Kiem tra ten process pm2 bang: pm2 list
    ) else (
        echo.
        echo Da build va restart xong tren Pi!
    )
) else (
    echo.
    echo Ban tu vao Pi lam not, chay lenh sau:
    echo   ssh %PI_USER%@%PI_HOST%
    echo   cd %PI_DEST%/backend ^&^& npm install ^&^& npx prisma db push ^&^& npm run build
    echo   cd %PI_DEST%/frontend ^&^& npm install ^&^& npm run build
    echo   pm2 restart %PM2_NAME%
)

rmdir /s /q "%STAGING%"
echo.
pause
exit /b 0

:copyfail
echo.
echo [LOI] Copy len Pi that bai. Kiem tra:
echo   - Pi co dang bat va cung mang khong (ping %PI_HOST%)
echo   - Mat khau SSH co dung khong
pause
exit /b 1
