# ⚙️ SETUP ENVIRONMENT VARIABLES - CRITICAL!

**Status:** Backend deployed tapi perlu JWT_SECRET agar bisa jalan!

---

## 🔐 JWT_SECRET (WAJIB!)

Backend baru menggunakan JWT authentication yang butuh secret key.

### Generate JWT_SECRET

**Option 1: PowerShell**
```powershell
# Generate random 32-byte base64 string
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Option 2: Online** (jika tidak ada OpenSSL)
- Buka: https://generate-secret.vercel.app/32
- Copy hasil generate

### Add ke Vercel

1. **Buka Vercel Dashboard:**
   https://vercel.com/nikmatrmt/proyek-hargapangan/settings/environment-variables

2. **Add new variable:**
   ```
   Name: JWT_SECRET
   Value: <paste-generated-secret>
   Environment: Production, Preview, Development
   ```

3. **Klik "Save"**

4. **Redeploy:**
   - Tab "Deployments"
   - Klik deployment teratas
   - Klik "Redeploy"
   - UNCHECK "Use existing Build Cache"

---

## ✅ Environment Variables Checklist

### Already Set (from previous):
- [x] `MONGODB_URI` - MongoDB connection string
- [x] `MONGODB_DB` - Database name (harga_pasar_mongo)
- [x] `ALLOWED_ORIGINS` - CORS allowed origins

### Need to Add:
- [ ] `JWT_SECRET` - JWT secret key (generate & add now!)

---

## 🧪 Test After Setup

### 1. Wait for deployment (2-3 minutes)

### 2. Test login:
```powershell
$body = @{username='admin';password='PasswordKuat123!'} | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/auth/login' `
  -Method POST -ContentType 'application/json' -Body $body
$response
```

**Expected result:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "role": "admin",
    ...
  }
}
```

### 3. Test dari Web Admin:
- Buka: https://proyek-hargapangan-admin.netlify.app
- Login: admin / PasswordKuat123!
- Should work without errors!

---

## 🐛 If Error: "JWT_SECRET environment variable is not set"

This means you haven't added JWT_SECRET yet. Follow steps above to add it.

---

## 📝 Summary

**What changed:**
- ✅ Old backend (15+ files) → New backend (4 files)
- ✅ Session-based auth → JWT-based auth
- ✅ Native modules issues → Pure JavaScript (no native deps)
- ✅ PHP + Node.js → Node.js only

**What you need to do:**
1. Generate JWT_SECRET
2. Add to Vercel environment variables
3. Redeploy
4. Test login

**ETA:** 5 minutes

---

**Next:** Generate JWT_SECRET dan add ke Vercel! 🚀
