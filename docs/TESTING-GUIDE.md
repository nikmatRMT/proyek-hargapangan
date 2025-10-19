# 🧪 Testing Guide - Post Deployment

**Status:** Backend sudah di-deploy ke Vercel!  
**Time:** Tunggu 2-3 menit untuk deployment selesai

---

## ⚠️ CRITICAL: Add JWT_SECRET First!

Sebelum test, **HARUS** add JWT_SECRET ke Vercel!

### Quick Steps:
1. **Buka:** https://vercel.com/nikmatrmt/proyek-hargapangan/settings/environment-variables

2. **Add variable:**
   ```
   Name: JWT_SECRET
   Value: iadAf9R5rzvyU7dOMbQ1YgrVid57m7sxnK+OiGHt7ss=
   Environments: ✓ Production ✓ Preview ✓ Development
   ```

3. **Save** → **Redeploy** (UNCHECK build cache)

---

## 🧪 Test 1: Check Environment Variables

```powershell
# Test diagnostic endpoint
Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/api/test'
```

**Expected Result:**
```json
{
  "timestamp": "2025-10-19...",
  "environment": {
    "MONGODB_URI": "✓ Set (hidden)",
    "MONGODB_DB": "harga_pasar_mongo",
    "JWT_SECRET": "✓ Set (hidden)",
    "ALLOWED_ORIGINS": "https://..."
  },
  "mongodb": {
    "status": "connected",
    "database": "harga_pasar_mongo",
    "collections": ["users", "laporan_harga", ...]
  }
}
```

**If JWT_SECRET missing:**
```json
{
  "environment": {
    "JWT_SECRET": "✗ Missing"  ← Add JWT_SECRET!
  }
}
```

---

## 🧪 Test 2: Login Endpoint

```powershell
# Test login
$body = @{
  username = 'admin'
  password = 'PasswordKuat123!'
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/auth/login' `
  -Method POST `
  -ContentType 'application/json' `
  -Body $body

# Show result
$response
```

**Expected Result:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "role": "admin",
    "nama_lengkap": "Administrator",
    "email": "admin@example.com"
  }
}
```

**Save token for next test:**
```powershell
$token = $response.token
```

---

## 🧪 Test 3: Get Current User (Me)

```powershell
# Test /auth/me endpoint
$headers = @{
  Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/auth/me' `
  -Headers $headers
```

**Expected Result:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "role": "admin",
    "nama_lengkap": "Administrator",
    "email": "admin@example.com"
  }
}
```

---

## 🧪 Test 4: Login from Web Admin

1. **Buka:** https://proyek-hargapangan-admin.netlify.app

2. **Login:**
   - Username: `admin`
   - Password: `PasswordKuat123!`

3. **Expected:**
   - ✅ No CORS errors
   - ✅ No 500 errors
   - ✅ Redirect to dashboard
   - ✅ User data displayed

---

## 🐛 Troubleshooting

### Error: "JWT_SECRET environment variable is not set"
→ Add JWT_SECRET ke Vercel (see steps above)

### Error: "MONGODB_URI environment variable is not set"
→ Check MONGODB_URI di Vercel dashboard

### Error: "Invalid credentials"
→ Check password di MongoDB (harus bcrypt hashed)

### CORS Error
→ Check ALLOWED_ORIGINS includes Netlify URL

### Connection timeout
→ Check MongoDB Atlas allows connections from Vercel IPs

---

## ✅ Success Criteria

All tests should return:
- ✅ Status 200 (no 500 errors)
- ✅ Valid JSON response
- ✅ No CORS errors
- ✅ MongoDB connected
- ✅ JWT token generated and valid

---

**Next:** Run tests setelah add JWT_SECRET! 🚀
