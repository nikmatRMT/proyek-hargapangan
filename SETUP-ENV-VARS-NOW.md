# ⚠️ URGENT: Setup Environment Variables di Vercel

## Status Saat Ini
❌ **Auth endpoints masih error 500**
❌ **MongoDB Data API belum bisa diakses**
❌ **Environment variables belum lengkap di Vercel**

---

## ✅ SOLUSI: Set Environment Variables

### 1. Buka Vercel Dashboard
👉 https://vercel.com/nikmatrmt/proyek-hargapangan/settings/environment-variables

### 2. Pastikan Ada 3 Variables Ini (MINIMUM):

| Variable Name | Value | Required |
|---------------|-------|----------|
| `MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/` | ✅ WAJIB |
| `MONGODB_DB` | `harga_pasar_mongo` | ✅ WAJIB |
| `ALLOWED_ORIGINS` | `https://proyek-hargapangan-admin.netlify.app,netlify.app` | ✅ WAJIB |

**Optional (untuk fallback ke Data API jika native driver gagal):**
| Variable Name | Value | Required |
|---------------|-------|----------|
| `MONGODB_DATA_API_URL` | `https://ap-southeast-1.aws.data.mongodb-api.com/app/...` | Optional |
| `MONGODB_DATA_API_KEY` | `your-api-key-here` | Optional |
| `MONGODB_DATA_SOURCE` | `Cluster0` | Optional |
| `FRONTEND_URL` | `https://proyek-hargapangan-admin.netlify.app` | Optional |

### 3. Cara Mendapatkan MONGODB_URI

#### A. Buka MongoDB Atlas Dashboard
👉 https://cloud.mongodb.com

#### B. Connect to Cluster
1. Klik **Connect** pada cluster Anda
2. Pilih **Drivers** (Node.js)
3. Copy **Connection String**

Format:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

#### C. Replace Credentials
- Ganti `<username>` dengan MongoDB username
- Ganti `<password>` dengan password
- Pastikan tidak ada karakter `<` `>` yang tersisa

#### D. Test Connection
Di terminal:
```bash
mongosh "mongodb+srv://username:password@cluster.mongodb.net/"
```

Jika berhasil connect, berarti connection string benar!

---

## 🧪 Test Setelah Setup

### 1. Redeploy di Vercel
- Klik tab **Deployments**
- Klik `...` → **Redeploy**
- Tunggu 2-3 menit

### 2. Test Auth Endpoint
```powershell
.\test-auth-endpoint.ps1
```

**Expected hasil:**
```
✅ Status: 200 OK
✅ CORS Allow-Origin: https://proyek-hargapangan-admin.netlify.app
✅ Status: 401 Unauthorized (expected!)
✅ Auth validation working
```

### 3. Test Login dari Browser
1. Buka: https://proyek-hargapangan-admin.netlify.app
2. Login: `admin / PasswordKuat123!`
3. Seharusnya **berhasil masuk dashboard**

---

## 📋 Checklist

- [ ] Buka MongoDB Atlas → Connect
- [ ] Copy Connection String (mongodb+srv://...)
- [ ] Replace username & password
- [ ] Buka Vercel Settings → Environment Variables
- [ ] Add 3 variables minimum:
  - [ ] MONGODB_URI (connection string)
  - [ ] MONGODB_DB (harga_pasar_mongo)
  - [ ] ALLOWED_ORIGINS (netlify.app)
- [ ] Check: Production, Preview, Development
- [ ] Save changes
- [ ] Redeploy (Deployments tab)
- [ ] Tunggu 2-3 menit
- [ ] Run `.\test-auth-endpoint.ps1`
- [ ] Test login di browser
- [ ] ✅ Login berhasil!

---

## 🔍 Troubleshooting

### Jika Masih Error 500
1. **Check Vercel Logs**
   - https://vercel.com/nikmatrmt/proyek-hargapangan/logs
   - Filter: Functions
   - Look for: `/auth/login` errors

2. **Common Errors:**
   - `MONGODB_DATA_API_URL is not defined` → env var not set
   - `401 Unauthorized` from Data API → API key wrong
   - `Invalid URL` → Data API URL format salah

### Verify Environment Variables
Di Vercel:
- Settings → Environment Variables
- Pastikan **Production**, **Preview**, **Development** semua checked
- Klik **Save** setelah edit

### Test MongoDB Data API Manual
```powershell
# Test Data API connection
$url = "YOUR_DATA_API_URL/action/findOne"
$key = "YOUR_API_KEY"
$body = @{
    dataSource = "Cluster0"
    database = "harga_pasar_mongo"
    collection = "users"
    filter = @{ username = "admin" }
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST `
    -Headers @{"api-key"=$key; "Content-Type"="application/json"} `
    -Body $body
```

**Expected:** Harus return document user admin

---

## 📞 Next Steps

Setelah env vars di-set dan redeploy:
1. Test endpoint: `.\test-auth-endpoint.ps1`
2. Test login browser
3. Jika berhasil → CORS & auth sudah OK! ✅
4. Jika masih error → Share Vercel logs untuk debug

**Estimated Time:** 10-15 menit
