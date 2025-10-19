# 🚀 Quick Start Guide

**Version:** 2.0.0 - Clean Reset (October 19, 2025)

---

## ✅ What's Done

- ✅ Backend reset & simplified (4 files only!)
- ✅ JWT-based authentication (no sessions)
- ✅ Documentation organized in `docs/` folder
- ✅ Backup available at `backup-before-reset` branch

---

## ⚠️ ACTION REQUIRED - Setup JWT Secret

Backend baru **butuh JWT_SECRET** untuk bisa jalan!

### 1. JWT_SECRET sudah di-generate:
```
iadAf9R5rzvyU7dOMbQ1YgrVid57m7sxnK+OiGHt7ss=
```

### 2. Add ke Vercel:
👉 https://vercel.com/nikmatrmt/proyek-hargapangan/settings/environment-variables

```
Name: JWT_SECRET
Value: iadAf9R5rzvyU7dOMbQ1YgrVid57m7sxnK+OiGHt7ss=
Environments: ✓ Production ✓ Preview ✓ Development
```

### 3. Redeploy:
- Tab "Deployments" → ... → "Redeploy"
- **⚠️ UNCHECK "Use existing Build Cache"**

### 4. Test (after 3-5 minutes):
```powershell
$body = @{username='admin';password='PasswordKuat123!'} | ConvertTo-Json
Invoke-RestMethod 'https://proyek-hargapangan.vercel.app/auth/login' `
  -Method POST -ContentType 'application/json' -Body $body
```

---

## 📚 Documentation

- **Setup Guide:** `docs/SETUP-JWT-SECRET.md`
- **API Docs:** `docs/API-DOCS.md`
- **Security:** `docs/SECURITY.md`
- **Reset Plan:** `docs/RESET-PLAN.md`

---

## 🏗️ New Backend Structure

```
api/
├── auth.js          → All auth endpoints (login, me, logout)
└── utils/
    ├── mongo.js     → MongoDB connection
    ├── cors.js      → CORS handling
    └── auth.js      → JWT utilities
```

**Total:** 4 files (was 15+!)

---

## 🔗 Links

- **Backend:** https://proyek-hargapangan.vercel.app
- **Frontend:** https://proyek-hargapangan-admin.netlify.app
- **GitHub:** https://github.com/nikmatRMT/proyek-hargapangan
- **Vercel Dashboard:** https://vercel.com/nikmatrmt/proyek-hargapangan

---

**Next Step:** Add JWT_SECRET ke Vercel! 🔑
