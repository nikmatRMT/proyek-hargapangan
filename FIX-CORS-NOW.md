# 🚨 FIX CORS ERROR - UPDATE VERCEL ENV VARS

## Masalah
❌ Login error 500 - MongoDB tidak bisa diakses
❌ CORS error - Netlify domain tidak diizinkan
❌ `/api/markets` → 404 Not Found

## Root Cause
Environment variables di Vercel **belum update** setelah deployment terakhir.

---

## ✅ SOLUSI - Update ALLOWED_ORIGINS di Vercel

### 1. Buka Vercel Dashboard
https://vercel.com/nikmatrmt/proyek-hargapangan/settings/environment-variables

### 2. Update ALLOWED_ORIGINS
Cari variable `ALLOWED_ORIGINS`, klik **Edit**, ganti value dengan:

```
https://proyek-hargapangan-admin.netlify.app,https://68f44c4243b68c2653d2a0d8--proyek-hargapangan-admin.netlify.app
```

**ATAU** untuk allow semua subdomain Netlify (lebih fleksibel):
```
https://proyek-hargapangan-admin.netlify.app,netlify.app
```

### 3. Verify All 7 Environment Variables
Pastikan semua ada dan terisi:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://...` (connection string lengkap) |
| `MONGODB_DB` | `harga_pasar_mongo` |
| `MONGODB_DATA_API_URL` | `https://ap-southeast-1.aws.data.mongodb-api.com/app/...` |
| `MONGODB_DATA_API_KEY` | `...` (API key) |
| `MONGODB_DATA_SOURCE` | `Cluster0` |
| `ALLOWED_ORIGINS` | ✏️ **UPDATE INI** (lihat value di atas) |
| `FRONTEND_URL` | `https://proyek-hargapangan-admin.netlify.app` |

### 4. Redeploy
Setelah update env vars:
1. Klik tab **Deployments**
2. Klik titik tiga (`...`) pada deployment paling atas
3. Pilih **Redeploy** → **Redeploy with existing Build Cache**
4. Tunggu 2-3 menit

---

## 🧪 Test Setelah Redeploy

### PowerShell Test Script
```powershell
# Test CORS
$origin = "https://68f44c4243b68c2653d2a0d8--proyek-hargapangan-admin.netlify.app"
Invoke-WebRequest -Uri "https://proyek-hargapangan.vercel.app/auth/login" `
  -Method OPTIONS `
  -Headers @{"Origin"=$origin; "Access-Control-Request-Method"="POST"}
```

Harusnya return **200 OK** dengan header `Access-Control-Allow-Origin`

### Browser Test
1. Buka: https://proyek-hargapangan-admin.netlify.app
2. Login dengan:
   - Username: `admin`
   - Password: `PasswordKuat123!`
3. Seharusnya **berhasil login** dan masuk dashboard

---

## 📋 Checklist
- [ ] Update `ALLOWED_ORIGINS` di Vercel
- [ ] Verify semua 7 env vars terisi
- [ ] Trigger redeploy
- [ ] Tunggu 2-3 menit deployment selesai
- [ ] Test OPTIONS request (CORS preflight)
- [ ] Test login dari browser
- [ ] Verify dashboard bisa load data (markets, prices)

---

## 🔍 Debug Jika Masih Error

### Cek Vercel Logs
1. Buka: https://vercel.com/nikmatrmt/proyek-hargapangan/logs
2. Filter: **Functions**
3. Cari error message dari `/auth/login`
4. Look for:
   - `Cannot find module '@mongodb-js/saslprep'` → dependency issue
   - `MONGODB_URI is not defined` → env var not set
   - `MongoServerError: Authentication failed` → wrong credentials

### Test MongoDB Connection
```powershell
# Test PHP endpoint (fallback ke Data API)
Invoke-WebRequest "https://proyek-hargapangan.vercel.app/api/check-dataapi"
```

Should return JSON dengan `available: true`

---

## 📝 Notes
- Netlify URL berubah setiap deploy (hash prefix `68f44c4243b68c2653d2a0d8`)
- Production URL tetap: `proyek-hargapangan-admin.netlify.app`
- CORS error normal jika domain tidak ada di `ALLOWED_ORIGINS`
- Error 500 biasanya MongoDB connection issue

**Estimated Time:** 5 menit
