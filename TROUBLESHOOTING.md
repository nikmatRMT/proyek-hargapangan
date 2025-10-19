# 🔧 TROUBLESHOOTING GUIDE

## ❌ MASALAH: Double `/api/api/` di URL

### Gejala:
```
https://proyek-hargapangan.vercel.app/api/api/markets   ❌
https://proyek-hargapangan.vercel.app/api/api/prices    ❌
```

### Penyebab:
Environment variable `VITE_API_URL` di **Netlify Dashboard** mengandung trailing `/api`:
```bash
# ❌ SALAH
VITE_API_URL=https://proyek-hargapangan.vercel.app/api

# ✅ BENAR
VITE_API_URL=https://proyek-hargapangan.vercel.app
```

### Solusi:

1. **Login ke Netlify Dashboard**: https://app.netlify.com
2. Pilih site: **proyek-hargapangan-admin**
3. Klik **Site settings** → **Environment variables**
4. Edit variable `VITE_API_URL`, pastikan nilainya:
   ```
   https://proyek-hargapangan.vercel.app
   ```
   **TANPA** `/api` di akhir!

5. Kembali ke **Deploys** tab
6. Klik **Trigger deploy** → **Clear cache and deploy site**
7. Tunggu deployment selesai (~1-2 menit)

---

## ❌ MASALAH: CORS Policy Error

### Gejala:
```
Access to fetch at 'https://proyek-hargapangan.vercel.app/api/markets' 
from origin 'https://proyek-hargapangan-admin.netlify.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

### Penyebab:
Environment variable `ALLOWED_ORIGINS` tidak di-set di **Vercel Dashboard**

### Solusi:

1. **Login ke Vercel Dashboard**: https://vercel.com/dashboard
2. Pilih project: **proyek-hargapangan**
3. Klik **Settings** → **Environment Variables**
4. Tambahkan variable baru:
   - **Name**: `ALLOWED_ORIGINS`
   - **Value**: `https://proyek-hargapangan-admin.netlify.app,https://proyek-hargapangan.vercel.app`
   - **Scope**: Production, Preview, Development (pilih semua)

5. Kembali ke **Deployments** tab
6. Klik deployment terakhir → **Redeploy**
7. Tunggu deployment selesai (~1-2 menit)

---

## ❌ MASALAH: Login Gagal dengan 401 Unauthorized

### Gejala:
```json
{
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

### Penyebab 1: Username/Password Salah
**Solusi**: Gunakan credentials yang benar
- Username: `admin`
- Password: `PasswordKuat123!`

### Penyebab 2: Environment Variable MongoDB Tidak Ada
**Solusi**: Set environment variables di Vercel (lihat ENVIRONMENT-SETUP.md)

---

## ❌ MASALAH: Environment Variables Tidak Terdeteksi

### Gejala:
Setelah set environment variable di dashboard, masih error "MONGODB_URI not configured"

### Penyebab:
Environment variables hanya diload saat **deployment**, bukan real-time.

### Solusi:
**WAJIB REDEPLOY** setelah mengubah environment variables:

**Di Vercel:**
1. Deployments tab → Pilih deployment terakhir → **Redeploy**

**Di Netlify:**
1. Deploys tab → **Trigger deploy** → **Clear cache and deploy site**

---

## ✅ CHECKLIST LENGKAP

Sebelum mengeluh error, pastikan sudah:

### Di Vercel (Backend):
- [ ] Set `MONGODB_URI`
- [ ] Set `MONGODB_DB`
- [ ] Set `MONGODB_DATA_API_URL`
- [ ] Set `MONGODB_DATA_API_KEY`
- [ ] Set `MONGODB_DATA_SOURCE`
- [ ] Set `ALLOWED_ORIGINS` (dengan Netlify URL)
- [ ] Set `FRONTEND_URL`
- [ ] **REDEPLOY** setelah set env vars

### Di Netlify (Frontend):
- [ ] Set `VITE_API_URL` = `https://proyek-hargapangan.vercel.app` (TANPA `/api`)
- [ ] Set `VITE_USE_SSE` = `false`
- [ ] **REDEPLOY** dengan clear cache

### Test:
- [ ] Buka https://proyek-hargapangan.vercel.app/api/markets (harus return JSON)
- [ ] Buka https://proyek-hargapangan-admin.netlify.app
- [ ] Login dengan admin / PasswordKuat123!
- [ ] Cek browser console (F12) → Network tab, pastikan tidak ada CORS error

---

## 🔍 DEBUG TIPS

### Cek Environment Variables Aktif di Vercel:
1. Buat file `/api/debug-env.js`:
```javascript
export default function handler(req, res) {
  res.json({
    MONGODB_URI: process.env.MONGODB_URI ? '✅ SET' : '❌ NOT SET',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '❌ NOT SET',
    FRONTEND_URL: process.env.FRONTEND_URL || '❌ NOT SET',
  });
}
```
2. Akses: https://proyek-hargapangan.vercel.app/api/debug-env

### Cek CORS Headers:
```bash
curl -I -H "Origin: https://proyek-hargapangan-admin.netlify.app" \
  https://proyek-hargapangan.vercel.app/api/markets
```

Harus ada header:
```
Access-Control-Allow-Origin: https://proyek-hargapangan-admin.netlify.app
Access-Control-Allow-Credentials: true
```

---

## 📞 KONTAK

Jika masih error setelah mengikuti semua langkah di atas:
1. Screenshoot error di browser console (F12)
2. Screenshoot environment variables di Vercel & Netlify dashboard
3. Test dengan curl dan kirim hasil output
