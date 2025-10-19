# ⚠️ URGENT: Setup Environment Variables di Vercel

## Status Saat Ini
❌ **Auth endpoints masih error 500**
❌ **MongoDB Data API belum bisa diakses**
❌ **Environment variables belum lengkap di Vercel**

---

## ✅ SOLUSI: Set Environment Variables

### 1. Buka Vercel Dashboard
👉 https://vercel.com/nikmatrmt/proyek-hargapangan/settings/environment-variables

### 2. Pastikan Ada 6 Variables Ini:

| Variable Name | Value | Required |
|---------------|-------|----------|
| `MONGODB_DATA_API_URL` | `https://ap-southeast-1.aws.data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1` | ✅ WAJIB |
| `MONGODB_DATA_API_KEY` | `your-api-key-here` | ✅ WAJIB |
| `MONGODB_DATA_SOURCE` | `Cluster0` | ✅ WAJIB |
| `MONGODB_DB` | `harga_pasar_mongo` | ✅ WAJIB |
| `ALLOWED_ORIGINS` | `https://proyek-hargapangan-admin.netlify.app,netlify.app` | ✅ WAJIB |
| `FRONTEND_URL` | `https://proyek-hargapangan-admin.netlify.app` | Optional |

### 3. Cara Mendapatkan MongoDB Data API Credentials

#### A. Buka MongoDB Atlas Dashboard
👉 https://cloud.mongodb.com

#### B. Klik Cluster → Data API
1. Tab **Data API** di menu kiri
2. **Enable Data API** jika belum aktif
3. **Create API Key**:
   - Name: `vercel-api-key`
   - Click **Generate API Key**
   - ⚠️ **COPY API KEY** (tidak bisa dilihat lagi!)

#### C. Get Data API URL
Format: `https://{region}.aws.data.mongodb-api.com/app/{app-id}/endpoint/data/v1`

Contoh:
```
https://ap-southeast-1.aws.data.mongodb-api.com/app/data-vuzikpv/endpoint/data/v1
```

#### D. Data Source Name
- Biasanya: `Cluster0`
- Lihat di **Database** → cluster name

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

- [ ] Buka MongoDB Atlas → Data API
- [ ] Enable Data API
- [ ] Create API Key
- [ ] Copy API Key (simpan!)
- [ ] Copy Data API URL
- [ ] Buka Vercel Settings → Environment Variables
- [ ] Add 6 variables (lihat tabel di atas)
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
