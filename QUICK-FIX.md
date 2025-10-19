# 🚀 Quick Fix Guide - CORS & MongoDB Issues

## ✅ Yang Sudah Diperbaiki (Just Deployed):
- ✅ CORS headers ditambahkan ke semua `/auth/*` endpoints
- ✅ Handle OPTIONS preflight request
- ✅ Fallback CORS jika `ALLOWED_ORIGINS` tidak di-set
- ✅ Add `@mongodb-js/saslprep` dependency untuk MongoDB auth
- ✅ **NEW:** Konsolidasi serverless functions (7 functions, was 15+)

## 📦 Latest Commits:
```
5fb8f2b - Fix: Reduce serverless functions count to fit Hobby plan limit
598829c - Fix: Add @mongodb-js/saslprep dependency for MongoDB authentication
fe7029e - Fix: Add CORS headers to auth endpoints and remove debug files
```

## 🏗️ Architecture:
- **PHP Endpoints** (1 function): `/api/*` → handles markets, commodities, prices
- **Node.js Auth** (6 functions): `/auth/*` → handles login, logout, me
- **Total: 7 functions** (well under Hobby plan limit of 12)

## ⏳ Tunggu Deployment Vercel (~2 menit)

Cek status: https://vercel.com/dashboard

## 🔧 Action Required - Set Environment Variables

### Di Vercel Dashboard:

1. **Buka:** https://vercel.com/dashboard
2. **Pilih project:** `proyek-hargapangan`
3. **Settings** → **Environment Variables**
4. **Add variable:**

```
Name: ALLOWED_ORIGINS
Value: https://proyek-hargapangan-admin.netlify.app,https://68f4360da6f752fc841aaaa8--proyek-hargapangan-admin.netlify.app,http://localhost:5173
Environment: Production, Preview, Development
```

*Note: Include both production dan preview URLs Netlify*

5. **Klik Save**
6. **Deployments tab** → Klik deployment terakhir → **Redeploy**

---

## 🧪 Test Setelah Redeploy

### 1. Test di Browser Console:
```javascript
// Buka: https://proyek-hargapangan-admin.netlify.app
// Paste di console:
fetch('https://proyek-hargapangan.vercel.app/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  credentials: 'include',
  body: JSON.stringify({username:'admin',password:'PasswordKuat123!'})
})
.then(r => r.json())
.then(d => console.log('✅ Login Success:', d))
.catch(e => console.error('❌ Login Error:', e));
```

### 2. Test Login dari UI:
1. Buka: https://proyek-hargapangan-admin.netlify.app
2. Login: admin / PasswordKuat123!
3. Should redirect to dashboard without CORS error

---

## 📊 Expected Results

### BEFORE (Current):
```
❌ CORS policy: No 'Access-Control-Allow-Origin' header
❌ POST /auth/login net::ERR_FAILED
```

### AFTER (Fixed):
```
✅ Status: 200 OK
✅ Response: {token: "...", user: {...}}
✅ Headers: Access-Control-Allow-Origin: https://...netlify.app
```

---

## 🔍 If Still Error After Fix:

### Check 1: Vercel Function Logs
- Dashboard → Deployments → View Function Logs
- Look for errors in `/auth/login`

### Check 2: Network Tab
- F12 → Network → Clear → Try login
- Check `/auth/login` request headers/response

### Check 3: Environment Variables
- Run in PowerShell:
```powershell
Invoke-RestMethod -Uri 'https://proyek-hargapangan.vercel.app/api/markets'
```
Should return JSON, not 500 error

---

**⏰ ETA:** 3-5 minutes (2 min deployment + 1 min testing)

**📞 Next:** Share screenshot hasil login attempt setelah deployment selesai
