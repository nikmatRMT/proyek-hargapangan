# quick-test.ps1
# Quick test untuk cek deployment status

Write-Host "🔍 Testing Deployment..." -ForegroundColor Cyan
Write-Host ""

$BACKEND = "https://proyek-hargapangan.vercel.app"

# Test 1: API Markets
Write-Host "1️⃣  Testing /api/markets..." -ForegroundColor Yellow
try {
    $markets = Invoke-RestMethod -Uri "$BACKEND/api/markets" -ErrorAction Stop
    Write-Host "   ✅ SUCCESS - Got $($markets.data.Count) markets" -ForegroundColor Green
} catch {
    Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: API Commodities
Write-Host "2️⃣  Testing /api/commodities..." -ForegroundColor Yellow
try {
    $commodities = Invoke-RestMethod -Uri "$BACKEND/api/commodities" -ErrorAction Stop
    Write-Host "   ✅ SUCCESS - Got $($commodities.data.Count) commodities" -ForegroundColor Green
} catch {
    Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Auth Login
Write-Host "3️⃣  Testing /auth/login..." -ForegroundColor Yellow
try {
    $body = @{username='admin';password='PasswordKuat123!'} | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$BACKEND/auth/login" -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop
    if ($login.token) {
        Write-Host "   ✅ SUCCESS - Login OK, got token" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Response OK but no token" -ForegroundColor Yellow
    }
} catch {
    $msg = $_.Exception.Message
    if ($msg -like "*401*") {
        Write-Host "   ❌ FAILED: Wrong credentials" -ForegroundColor Red
    } else {
        Write-Host "   ❌ FAILED: $msg" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "✅ All tests passed = Ready to use!" -ForegroundColor Green
Write-Host "❌ Any test failed = Wait more or check logs" -ForegroundColor Yellow
