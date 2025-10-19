# test-deployment.ps1
# Script untuk test deployment Vercel dan Netlify
# Usage: .\test-deployment.ps1

Write-Host "🔍 Testing Vercel Backend Deployment..." -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://proyek-hargapangan.vercel.app"
$FRONTEND_URL = "https://proyek-hargapangan-admin.netlify.app"

# Test 1: Debug Environment Variables
Write-Host "📋 Test 1: Checking Environment Variables..." -ForegroundColor Yellow
try {
    $envResult = Invoke-RestMethod -Uri "$BACKEND_URL/api/node/debug-env" -ErrorAction Stop
    Write-Host "✅ Debug endpoint accessible" -ForegroundColor Green
    
    # Check each variable
    $vars = $envResult.variables
    foreach ($key in $vars.Keys) {
        $value = $vars[$key]
        if ($value -like "*✅*") {
            Write-Host "  ✅ $key : SET" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $key : NOT SET" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Debug endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: CORS Headers
Write-Host "📋 Test 2: Testing CORS Headers..." -ForegroundColor Yellow
try {
    $headers = @{
        'Origin' = $FRONTEND_URL
    }
    $corsResult = Invoke-RestMethod -Uri "$BACKEND_URL/api/node/test-cors" -Headers $headers -ErrorAction Stop
    Write-Host "✅ CORS test passed" -ForegroundColor Green
    Write-Host "  Origin matched: $($corsResult.cors.matched)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ CORS test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: API Endpoints
Write-Host "📋 Test 3: Testing API Endpoints..." -ForegroundColor Yellow

$endpoints = @(
    @{name="Markets"; url="/api/markets"},
    @{name="Commodities"; url="/api/commodities"},
    @{name="Prices"; url="/api/prices"}
)

foreach ($endpoint in $endpoints) {
    try {
        $result = Invoke-RestMethod -Uri "$BACKEND_URL$($endpoint.url)" -ErrorAction Stop
        if ($result.data) {
            $count = $result.data.Count
            Write-Host "  ✅ $($endpoint.name): $count items" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $($endpoint.name): Response OK but no data" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ $($endpoint.name): Failed" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Authentication
Write-Host "📋 Test 4: Testing Login Endpoint..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "PasswordKuat123!"
    } | ConvertTo-Json
    
    $loginResult = Invoke-RestMethod -Uri "$BACKEND_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    
    if ($loginResult.token) {
        Write-Host "  ✅ Login successful" -ForegroundColor Green
        Write-Host "  User: $($loginResult.user.username)" -ForegroundColor Cyan
        Write-Host "  Role: $($loginResult.user.role)" -ForegroundColor Cyan
        
        # Test /auth/me with token
        $meHeaders = @{
            'Authorization' = "Bearer $($loginResult.token)"
        }
        $meResult = Invoke-RestMethod -Uri "$BACKEND_URL/auth/me" -Headers $meHeaders -ErrorAction Stop
        Write-Host "  ✅ Token validation successful" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Login response missing token" -ForegroundColor Yellow
    }
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -like "*401*" -or $errorMsg -like "*Unauthorized*") {
        Write-Host "  ❌ Login failed: Invalid credentials" -ForegroundColor Red
    } elseif ($errorMsg -like "*500*") {
        Write-Host "  ❌ Login failed: Server error (check MongoDB connection)" -ForegroundColor Red
    } else {
        Write-Host "  ❌ Login failed: $errorMsg" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor White
Write-Host "Frontend URL: $FRONTEND_URL" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If env variables are NOT SET: Go to Vercel Dashboard and add them" -ForegroundColor White
Write-Host "2. If CORS fails: Check ALLOWED_ORIGINS in Vercel" -ForegroundColor White
Write-Host "3. If login fails: Check MONGODB_URI and redeploy" -ForegroundColor White
Write-Host "4. After fixing: Redeploy and run this script again" -ForegroundColor White
Write-Host ""
