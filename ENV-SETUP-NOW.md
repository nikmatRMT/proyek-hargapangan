# ⚠️ CRITICAL: Environment Variables Must Be Set!

## 🔴 Current Status: DEPLOYMENT FAILED

### Error:
- `/api/markets` → 404 Not Found  
- `/api/commodities` → 404 Not Found  
- `/auth/login` → 500 Internal Server Error

### Root Cause:
**Environment variables belum di-set di Vercel Dashboard!**

Without env vars:
- MongoDB connection fails → 500 errors
- PHP endpoints can't connect to database → 404/500 errors
- Login endpoint can't authenticate → 500 errors

---

## ✅ SOLUTION: Set Environment Variables NOW!

### Step-by-Step (5 minutes):

#### 1. Open Vercel Dashboard
**URL:** https://vercel.com/dashboard

#### 2. Select Project
Click: **proyek-hargapangan**

#### 3. Go to Settings
Click: **Settings** tab → **Environment Variables** (sidebar)

#### 4. Add ALL 7 Variables

Copy-paste each variable **EXACTLY** as shown:

```bash
# Variable 1
Name: MONGODB_URI
Value: mongodb+srv://Vercel-Admin-proyek-hargapangan:M6xSwPrwTctMFtLi@proyek-hargapangan.jcfbfhs.mongodb.net/?retryWrites=true&w=majority
Environments: ✅ Production  ✅ Preview  ✅ Development

# Variable 2
Name: MONGODB_DB
Value: harga_pasar_mongo
Environments: ✅ Production  ✅ Preview  ✅ Development

# Variable 3
Name: MONGODB_DATA_API_URL
Value: https://data.mongodb-api.com/app/data-vuzikpv/endpoint/data/v1
Environments: ✅ Production  ✅ Preview  ✅ Development

# Variable 4
Name: MONGODB_DATA_API_KEY
Value: BxQ7WWQlW5LymOq7BJjvdC2LE3GX8j3EtkOo0sJQUaTaHxJe2g1CbZ4UPTGRrmPF
Environments: ✅ Production  ✅ Preview  ✅ Development

# Variable 5
Name: MONGODB_DATA_SOURCE
Value: proyek-hargapangan
Environments: ✅ Production  ✅ Preview  ✅ Development

# Variable 6
Name: ALLOWED_ORIGINS
Value: https://proyek-hargapangan-admin.netlify.app,https://68f4360da6f752fc841aaaa8--proyek-hargapangan-admin.netlify.app,http://localhost:5173
Environments: ✅ Production  ✅ Preview  ✅ Development

# Variable 7
Name: FRONTEND_URL
Value: https://proyek-hargapangan-admin.netlify.app
Environments: ✅ Production  ✅ Preview  ✅ Development
```

#### 5. Save Each Variable
Click **Save** after adding each variable

#### 6. REDEPLOY (CRITICAL!)
⚠️ **Environment variables only take effect after redeployment!**

1. Click **Deployments** tab
2. Click latest deployment (paling atas)
3. Click **⋯** (3 dots menu)
4. Click **Redeploy**
5. Confirm redeploy
6. **Wait 2-3 minutes** for deployment to complete

---

## 🧪 Test After Redeploy

Run in PowerShell:
```powershell
.\quick-test.ps1
```

### Expected Output:
```
✅ SUCCESS - Got 4 markets
✅ SUCCESS - Got 21 commodities  
✅ SUCCESS - Login OK, got token
```

---

## 📋 Checklist

- [ ] Login to Vercel Dashboard
- [ ] Open project settings
- [ ] Add variable 1: MONGODB_URI
- [ ] Add variable 2: MONGODB_DB
- [ ] Add variable 3: MONGODB_DATA_API_URL
- [ ] Add variable 4: MONGODB_DATA_API_KEY
- [ ] Add variable 5: MONGODB_DATA_SOURCE
- [ ] Add variable 6: ALLOWED_ORIGINS
- [ ] Add variable 7: FRONTEND_URL
- [ ] Click Redeploy
- [ ] Wait 2-3 minutes
- [ ] Run `.\quick-test.ps1`
- [ ] All tests pass ✅

---

## 🚨 Important Notes

1. **Don't skip Redeploy!** Env vars won't work without it
2. **Check spelling!** Variable names are case-sensitive
3. **All 3 environments!** Select Production, Preview, AND Development
4. **Wait for deployment!** Give it 2-3 minutes to complete
5. **Test afterwards!** Run quick-test.ps1 to verify

---

## 📞 After Setup

Once all tests pass:

1. **Frontend should work!**
   - Open: https://proyek-hargapangan-admin.netlify.app
   - Login: admin / PasswordKuat123!
   - Should redirect to dashboard

2. **API endpoints work!**
   - https://proyek-hargapangan.vercel.app/api/markets
   - https://proyek-hargapangan.vercel.app/api/commodities
   - https://proyek-hargapangan.vercel.app/api/prices

---

**⏰ Time Estimate:** 5-10 minutes total

**🎯 Goal:** All tests passing, frontend can login successfully!
