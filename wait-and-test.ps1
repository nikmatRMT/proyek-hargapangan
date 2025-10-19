# wait-and-test.ps1
# Wait for deployment and test repeatedly

Write-Host "`n⏳ Waiting for Vercel deployment to complete..." -ForegroundColor Cyan
Write-Host "   Deployment triggered at: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
Write-Host "   Testing every 30 seconds..." -ForegroundColor Gray
Write-Host ""

$maxAttempts = 6  # Test 6 kali (3 menit)
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "[$attempt/$maxAttempts] Testing... " -NoNewline -ForegroundColor Yellow
    
    try {
        $diag = Invoke-RestMethod -Uri "https://proyek-hargapangan.vercel.app/api/node/test-env" -ErrorAction Stop
        
        if ($diag.mongodb.status -eq "connected") {
            Write-Host "✅ SUCCESS!" -ForegroundColor Green
            Write-Host ""
            Write-Host "MongoDB Status:" -ForegroundColor Cyan
            Write-Host "  ✅ Connected to database" -ForegroundColor Green
            Write-Host "  DB: $($diag.env_vars.MONGODB_DB)" -ForegroundColor Gray
            Write-Host ""
            
            Write-Host "Testing auth endpoint..." -ForegroundColor Cyan
            try {
                $auth = Invoke-WebRequest -Uri "https://proyek-hargapangan.vercel.app/auth/login" `
                    -Method OPTIONS `
                    -Headers @{"Origin"="https://proyek-hargapangan-admin.netlify.app"}
                
                Write-Host "  ✅ Auth endpoint: $($auth.StatusCode) OK" -ForegroundColor Green
                $cors = $auth.Headers["Access-Control-Allow-Origin"]
                if ($cors) {
                    Write-Host "  ✅ CORS: $cors" -ForegroundColor Green
                }
            } catch {
                Write-Host "  ⚠️  Auth endpoint: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
            }
            
            Write-Host ""
            Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║  🎉 DEPLOYMENT BERHASIL!             ║" -ForegroundColor Green
            Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Green
            Write-Host ""
            Write-Host "Silakan test login di browser:" -ForegroundColor Cyan
            Write-Host "  https://proyek-hargapangan-admin.netlify.app" -ForegroundColor White
            Write-Host "  Username: admin" -ForegroundColor Gray
            Write-Host "  Password: PasswordKuat123!" -ForegroundColor Gray
            Write-Host ""
            
            break
        } else {
            Write-Host "❌ MongoDB: $($diag.mongodb.status)" -ForegroundColor Red
            Write-Host "   Error: $($diag.mongodb.message)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Endpoint not ready" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
    }
    
    if ($attempt -lt $maxAttempts) {
        Write-Host "   Waiting 30 seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    }
}

if ($attempt -eq $maxAttempts) {
    Write-Host ""
    Write-Host "⏱️  Max attempts reached" -ForegroundColor Yellow
    Write-Host "   Deployment mungkin butuh waktu lebih lama" -ForegroundColor Gray
    Write-Host "   Coba manual: Invoke-RestMethod https://proyek-hargapangan.vercel.app/api/node/test-env" -ForegroundColor Cyan
    Write-Host ""
}
