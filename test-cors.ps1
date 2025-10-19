# Test Vercel Backend Endpoints
Write-Host "`n=== Testing Vercel Backend ===" -ForegroundColor Cyan

$base = "https://proyek-hargapangan.vercel.app"
$origin = "https://68f44c4243b68c2653d2a0d8--proyek-hargapangan-admin.netlify.app"

Write-Host "`n1. Testing /api/markets (PHP)..." -ForegroundColor Yellow
try {
    $res = Invoke-WebRequest -Uri "$base/api/markets" -Headers @{"Origin"=$origin} -ErrorAction Stop
    Write-Host " Status: $($res.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host " Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing /auth/login OPTIONS (Node.js preflight)..." -ForegroundColor Yellow
try {
    $res = Invoke-WebRequest -Uri "$base/auth/login" -Method OPTIONS -Headers @{"Origin"=$origin; "Access-Control-Request-Method"="POST"} -ErrorAction Stop
    Write-Host " Status: $($res.StatusCode)" -ForegroundColor Green
    Write-Host "  CORS Headers:" -ForegroundColor Gray
    $res.Headers["Access-Control-Allow-Origin"] | ForEach-Object { Write-Host "    Allow-Origin: $_" -ForegroundColor Gray }
} catch {
    Write-Host " Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Testing /api/node/auth-login directly..." -ForegroundColor Yellow
try {
    $res = Invoke-WebRequest -Uri "$base/api/node/auth-login" -Method OPTIONS -Headers @{"Origin"=$origin} -ErrorAction Stop
    Write-Host " Status: $($res.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host " Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Check ALLOWED_ORIGINS configuration..." -ForegroundColor Yellow
Write-Host "  Backend should allow: $origin" -ForegroundColor Gray
Write-Host "  Or: 68f44c4243b68c2653d2a0d8--proyek-hargapangan-admin.netlify.app" -ForegroundColor Gray
Write-Host "  Or: proyek-hargapangan-admin.netlify.app (wildcard)" -ForegroundColor Gray

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Go to Vercel Dashboard  proyek-hargapangan  Settings  Environment Variables"
Write-Host "2. Check ALLOWED_ORIGINS value includes Netlify domain"
Write-Host "3. If missing, add: https://proyek-hargapangan-admin.netlify.app,https://68f44c4243b68c2653d2a0d8--proyek-hargapangan-admin.netlify.app"
Write-Host "4. Redeploy after updating env vars"
