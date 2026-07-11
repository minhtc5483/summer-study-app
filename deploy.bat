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
ssh pi@192.168.10.121 "cd /home/pi/summer-study-app && rm -f backend/seed.js backend/seed.d.ts backend/seed.js.map backend/seed.d.ts.map && git reset --hard HEAD && git pull origin main && echo 'Building Backend...' && cd backend && npm install && npx tsc && echo 'Building Frontend...' && cd ../frontend && npm install && npm run build && cd .. && pm2 restart ecosystem.config.js"

echo.
echo ==========================================
echo    DEPLOY SUCCESSFUL!
echo ==========================================
