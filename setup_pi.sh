#!/bin/bash
echo "=========================================="
echo " Thiết lập Môi trường Ôn Luyện Hè trên Pi "
echo "=========================================="

# 1. Update system & install dependencies
sudo apt-get update
sudo apt-get install -y curl git build-essential

# 2. Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 & serve globally
sudo npm install -g pm2 serve

# 4. Clone repository
cd /home/pi
if [ ! -d "summer-study-app" ]; then
  git clone https://github.com/minhtc5483/summer-study-app.git
fi
cd summer-study-app
git pull origin main

# 5. Build Backend
echo "Building Backend..."
cd backend
npm install
npx prisma generate
npx tsc
cd ..

# 6. Build Frontend
echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 7. Start PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 > pm2_startup.sh
chmod +x pm2_startup.sh
./pm2_startup.sh

echo "=========================================="
echo " Triển khai thành công! "
echo " Frontend: http://$(hostname -I | awk '{print $1}'):5173"
echo " Backend: http://$(hostname -I | awk '{print $1}'):3000"
echo "=========================================="
