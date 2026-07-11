@echo off
echo ==========================================
echo    DEPLOY TO RASPBERRY PI
echo ==========================================

echo [1/3] Pushing to GitHub...
git add .
git commit -m "Auto deploy update"
git push origin main

echo.
echo [2/3] Pulling and Rebuilding on Pi...
ssh pi@192.168.10.121 "cd /home/pi/summer-study-app && git pull origin main && echo 'Building Backend...' && cd backend && npx tsc && echo 'Building Frontend...' && cd ../frontend && npm run build && cd .. && pm2 restart ecosystem.config.js"

echo.
echo ==========================================
echo    DEPLOY SUCCESSFUL!
echo ==========================================
