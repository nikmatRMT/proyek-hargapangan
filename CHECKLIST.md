# ✅ CHECKLIST - Fix Login Error

## Status Test (Just Now)
- ❌ `/` → 404
- ❌ `/api/health` → 404  
- ❌ `/auth/login` → 500

## ✅ YANG SUDAH SELESAI
- ✅ Code sudah benar (revert ke versi yang working)
- ✅ Dependencies sudah benar (mongodb, bcryptjs)
- ✅ CORS headers sudah ada
- ✅ Routing sudah benar (vercel.json)
- ✅ Code sudah di-push ke GitHub
- ✅ Deployment triggered

## ❌ YANG MASIH KURANG
- ❌ Environment variables belum diset di Vercel

---

## 🚀 ACTION PLAN (5 LANGKAH)

### 1. ⏳ Tunggu Deployment Selesai
**Cek status:** https://vercel.com/nikmatrmt/proyek-hargapangan

**Tunggu sampai status:** `Ready` ✅ (bukan `Building` atau `Error`)

**Estimated time:** 2-3 menit dari push terakhir

---

### 2. ⚙️ Set Environment Variables

**Go to:** Settings → Environment Variables

**Add 3 variables ini:**

#### Variable 1: MONGODB_URI
```
Name: MONGODB_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/
Environments: ☑ Production ☑ Preview ☑ Development
```

**Cara dapat:**
1. Buka MongoDB Atlas: https://cloud.mongodb.com
2. Klik **Connect** di cluster
3. Pilih **Drivers**
4. Copy connection string
5. Ganti `<username>` dan `<password>` dengan credentials yang benar

---

#### Variable 2: MONGODB_DB
```
Name: MONGODB_DB
Value: harga_pasar_mongo
Environments: ☑ Production ☑ Preview ☑ Development
```

---

#### Variable 3: ALLOWED_ORIGINS
```
Name: ALLOWED_ORIGINS
Value: netlify.app
Environments: ☑ Production ☑ Preview ☑ Development
```

**Alternative (more specific):**
```
Value: https://proyek-hargapangan-admin.netlify.app,netlify.app
```

---

### 3. 💾 Save Variables
Klik **Save** setelah add setiap variable

---

### 4. 🔄 Redeploy
**PENTING:** Env vars baru hanya aktif setelah redeploy!

1. Klik tab **Deployments**
2. Klik titik tiga (`...`) di deployment paling atas
3. Pilih **Redeploy**
4. Tunggu 2-3 menit

---

### 5. 🧪 Test
Setelah redeploy selesai (status `Ready`):

```powershell
.\test-auth-endpoint.ps1
```

**Expected result:**
```
✅ Status: 200 OK (OPTIONS)
✅ CORS Allow-Origin: netlify.app
✅ Status: 401 Unauthorized (wrong password test)
✅ Auth validation working
```

**Test di browser:**
1. Buka: https://proyek-hargapangan-admin.netlify.app
2. Login: `admin / PasswordKuat123!`
3. Seharusnya masuk dashboard ✅

---

## 🔍 Troubleshooting

### Jika masih 500 setelah redeploy:
1. **Check Vercel Logs**
   - https://vercel.com/nikmatrmt/proyek-hargapangan/logs
   - Filter: **Functions**
   - Look for errors from `/auth/login`

2. **Common errors:**
   - `MONGODB_URI is not defined` → env var not saved properly
   - `MongoServerError: Authentication failed` → wrong username/password in connection string
   - `Cannot find module '@mongodb-js/saslprep'` → package.json issue (shouldn't happen now)

3. **Verify env vars:**
   - Settings → Environment Variables
   - Pastikan ada 3 variables
   - Pastikan **Production** checked
   - Pastikan tidak ada typo di MONGODB_URI

### Jika MONGODB_URI tidak yakin benar:
Test connection string dulu:
```powershell
# Install mongosh jika belum ada
# Test connection:
mongosh "mongodb+srv://username:password@cluster.mongodb.net/"
```

Jika berhasil connect, berarti URI benar!

---

## 📝 Summary
- **Code:** ✅ Sudah benar
- **Deployment:** ⏳ Tunggu selesai
- **Env Vars:** ❌ Belum diset (WAJIB!)
- **Action:** Set 3 env vars → Redeploy → Test

**Estimated total time:** 10-15 menit

---

**File ini created:** 2025-10-19
**Latest commit:** be25f8f
**Status:** Waiting for env vars setup
