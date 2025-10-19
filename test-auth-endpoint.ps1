# test-auth-endpoint.ps1
# Test auth endpoints after Data API migration

Write-Host "`n=== Testing Auth Endpoints (Data API) ===" -ForegroundColor Cyan

$base = "https://proyek-hargapangan.vercel.app"
$origin = "https://proyek-hargapangan-admin.netlify.app"

# Test 1: OPTIONS preflight
Write-Host "`n1. Testing CORS preflight (OPTIONS)..." -ForegroundColor Yellow
try {
    $res = Invoke-WebRequest -Uri "$base/auth/login" `
        -Method OPTIONS `
        -Headers @{
            "Origin" = $origin
            "Access-Control-Request-Method" = "POST"
        }
    
    Write-Host "   ✅ Status: $($res.StatusCode) OK" -ForegroundColor Green
    
    $corsHeader = $res.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader) {
        Write-Host "   ✅ CORS Allow-Origin: $corsHeader" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No Access-Control-Allow-Origin header" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   ❌ Status: $statusCode" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 2: POST with wrong credentials (should get 401)
Write-Host "`n2. Testing POST login (wrong password)..." -ForegroundColor Yellow
try {
    $body = '{"username":"admin","password":"wrongpassword"}'
    
    $res = Invoke-WebRequest -Uri "$base/auth/login" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -Headers @{ "Origin" = $origin }
    
    Write-Host "   ⚠️  Got $($res.StatusCode) (unexpected)" -ForegroundColor Yellow
    Write-Host "   Response: $($res.Content)"
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Status: 401 Unauthorized (expected!)" -ForegroundColor Green
        Write-Host "   ✅ Auth validation working" -ForegroundColor Green
    } elseif ($statusCode -eq 500) {
        Write-Host "   ❌ Status: 500 Internal Server Error" -ForegroundColor Red
        Write-Host "   ❌ MongoDB Data API connection failed!" -ForegroundColor Red
        Write-Host "   Check Vercel environment variables!" -ForegroundColor Yellow
    } else {
        Write-Host "   ⚠️  Status: $statusCode" -ForegroundColor Yellow
        Write-Host "   Message: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Test 3: Check deployment status
Write-Host "`n3. Checking deployment status..." -ForegroundColor Yellow
Write-Host "   Latest commit: $(git log -1 --oneline)" -ForegroundColor Gray
Write-Host "   Deployment URL: https://vercel.com/nikmatrmt/proyek-hargapangan" -ForegroundColor Gray

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "If you see 500 error, check:" -ForegroundColor Yellow
Write-Host "  1. Environment variables in Vercel (MONGODB_DATA_API_URL, etc.)" -ForegroundColor Gray
Write-Host "  2. Deployment logs: https://vercel.com/nikmatrmt/proyek-hargapangan/logs" -ForegroundColor Gray
Write-Host "  3. Wait 2-3 minutes for deployment to complete" -ForegroundColor Gray
Write-Host ""
