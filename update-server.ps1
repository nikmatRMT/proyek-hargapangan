# Script untuk update server production
# Jalankan: .\update-server.ps1

Write-Host "Connecting to server..." -ForegroundColor Green

ssh root@144.126.218.88 @"
cd /root/proyek-hargapangan
echo "Pulling latest changes..."
git pull origin main
echo "Building web-admin..."
cd web-admin
npm run build
echo "Restarting PM2..."
pm2 restart web-admin
echo "Done! Server updated successfully!"
"@

Write-Host "Update completed! Refresh browser dengan Ctrl+Shift+R" -ForegroundColor Yellow
