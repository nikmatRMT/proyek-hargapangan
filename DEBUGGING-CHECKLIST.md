# 🐛 Debugging Checklist

## Status Saat Ini

### Error yang Terjadi:
1. ❌ **Double `/api/api/` di URL**
   - `https://proyek-hargapangan.vercel.app/api/api/markets`
   - Seharusnya: `https://proyek-hargapangan.vercel.app/api/markets`

2. ❌ **CORS Error**
   - "No 'Access-Control-Allow-Origin' header"

---

## 🔍 Langkah Debugging

### STEP 1: Cek Environment Variables di Vercel ⏳

Tunggu deployment selesai (~2 menit), lalu test:

```bash
# Test debug endpoint
curl https://proyek-hargapangan.vercel.app/api/debug-env

# Atau buka di browser:
# https://proyek-hargapangan.vercel.app/api/debug-env
```

**Expected Output:**
```json
{
  "variables": {
    "MONGODB_URI": "✅ SET",
    "MONGODB_DB": "harga_pasar_mongo",
    "ALLOWED_ORIGINS": "https://proyek-hargapangan-admin.netlify.app,...",
    "FRONTEND_URL": "https://proyek-hargapangan-admin.netlify.app"
  }
}
```

**Jika masih `❌ NOT SET`:**
- [ ] Buka Vercel Dashboard: https://vercel.com/dashboard
- [ ] Pilih project: **proyek-hargapangan**
- [ ] Settings → Environment Variables
- [ ] Add semua variables dari `ENVIRONMENT-SETUP.md`
- [ ] **REDEPLOY** setelah add variables

---

### STEP 2: Test CORS Headers ⏳

```bash
# Test CORS dari command line
curl -I -H "Origin: https://proyek-hargapangan-admin.netlify.app" \
  https://proyek-hargapangan.vercel.app/api/test-cors

# Cari header:
# Access-Control-Allow-Origin: https://proyek-hargapangan-admin.netlify.app
# Access-Control-Allow-Credentials: true
```

**Atau test di browser:**
```javascript
// Buka console di https://proyek-hargapangan-admin.netlify.app
// Paste code ini:
fetch('https://proyek-hargapangan.vercel.app/api/test-cors', {
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('CORS Test:', d))
.catch(e => console.error('CORS Error:', e));
```

**Jika CORS masih error:**
- [ ] Pastikan `ALLOWED_ORIGINS` sudah di-set di Vercel
- [ ] Redeploy Vercel
- [ ] Clear browser cache (Ctrl+Shift+R)

---

### STEP 3: Fix Double `/api/api/` di Netlify ⏳

**Penyebab:** Environment variable `VITE_API_URL` di Netlify Dashboard salah

**Fix:**
1. [ ] Buka Netlify Dashboard: https://app.netlify.com
2. [ ] Pilih site: **proyek-hargapangan-admin**
3. [ ] Site settings → Environment variables
4. [ ] Cari `VITE_API_URL`
5. [ ] **Edit** dan pastikan nilainya:
   ```
   https://proyek-hargapangan.vercel.app
   ```
   **TANPA** `/api` di akhir!
6. [ ] Save
7. [ ] Deploys tab → **Trigger deploy** → **Clear cache and deploy site**
8. [ ] Tunggu ~2 menit

---

### STEP 4: Test Backend Endpoints

Setelah environment variables di-set dan redeploy selesai:

```bash
# Test markets endpoint
curl https://proyek-hargapangan.vercel.app/api/markets

# Test commodities
curl https://proyek-hargapangan.vercel.app/api/commodities

# Test prices
curl https://proyek-hargapangan.vercel.app/api/prices
```

**Expected:** Return JSON data, bukan error 500

---

### STEP 5: Test Login dari Frontend

1. [ ] Buka: https://proyek-hargapangan-admin.netlify.app
2. [ ] Buka browser console (F12)
3. [ ] Klik tab **Network**
4. [ ] Clear all (🚫 icon)
5. [ ] Login dengan:
   - Username: `admin`
   - Password: `PasswordKuat123!`
6. [ ] Cek request ke `/auth/login`:
   - Status: **200 OK** ✅
   - Response: ada `token` dan `user` object
   - Headers: ada `Access-Control-Allow-Origin`

**Jika masih error:**
- [ ] Check console untuk error message
- [ ] Check Network tab untuk failed requests
- [ ] Screenshot error dan lanjutkan debugging

---

## 🎯 Quick Test Commands (PowerShell)

```powershell
# Test debug endpoint
Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/api/debug-env'

# Test CORS
$headers = @{'Origin'='https://proyek-hargapangan-admin.netlify.app'}
Invoke-WebRequest -Uri 'https://proyek-hargapangan.vercel.app/api/test-cors' -Headers $headers -Method Options | Select-Object -ExpandProperty Headers

# Test login
$body = @{username='admin';password='PasswordKuat123!'} | ConvertTo-Json
Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/auth/login' -Method POST -Body $body -ContentType 'application/json'
```

---

## 📋 Environment Variables Checklist

### Vercel (Backend):
- [ ] `MONGODB_URI` = `mongodb+srv://...` (dari MongoDB Atlas)
- [ ] `MONGODB_DB` = `harga_pasar_mongo`
- [ ] `MONGODB_DATA_API_URL` = `https://data.mongodb-api.com/...`
- [ ] `MONGODB_DATA_API_KEY` = `<API_KEY>`
- [ ] `MONGODB_DATA_SOURCE` = `proyek-hargapangan`
- [ ] `ALLOWED_ORIGINS` = `https://proyek-hargapangan-admin.netlify.app,https://proyek-hargapangan.vercel.app`
- [ ] `FRONTEND_URL` = `https://proyek-hargapangan-admin.netlify.app`
- [ ] **REDEPLOY** after setting

### Netlify (Frontend):
- [ ] `VITE_API_URL` = `https://proyek-hargapangan.vercel.app` (TANPA `/api`)
- [ ] `VITE_USE_SSE` = `false`
- [ ] **TRIGGER DEPLOY** → Clear cache and deploy

---

## 🚨 Troubleshooting

### Jika `/api/debug-env` return 404:
- Tunggu 2-3 menit untuk deployment selesai
- Refresh/clear cache
- Check Vercel dashboard → Deployments → latest deployment status

### Jika environment variables masih `NOT SET`:
- Double check spelling di dashboard
- Pastikan scope: Production, Preview, Development (pilih semua)
- Redeploy setelah add variables
- Wait 2-3 minutes untuk propagate

### Jika login masih gagal setelah semua fix:
- Check MongoDB connection (test di MongoDB Compass)
- Check Vercel function logs (Dashboard → Deployments → View Logs)
- Verify password hash di database matches bcryptjs format

---

## ✅ Success Criteria

Debugging selesai jika:
- [ ] `/api/debug-env` return semua variables ✅ SET
- [ ] `/api/test-cors` return success tanpa CORS error
- [ ] `/api/markets` return JSON data
- [ ] Login dari frontend berhasil (status 200, dapat token)
- [ ] Dashboard load data tanpa error

---

**⏰ Estimated Time:** 15-30 menit (tergantung deployment speed)

**Next Step:** Tunggu Vercel deployment selesai, lalu jalankan test dari STEP 1
