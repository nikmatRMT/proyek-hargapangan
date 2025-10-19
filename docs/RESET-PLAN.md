# 🔄 RESET PROJECT PLAN - Clean Start

**Tanggal:** 19 Oktober 2025
**Tujuan:** Hapus semua backend code, file debugging, mulai dari awal yang clean

---

## ✅ YANG AKAN DIPERTAHANKAN

### 1. Environment Variables
- ✅ `.env` file (local development)
- ✅ Vercel environment variables (semua tetap di dashboard)
- ✅ Netlify environment variables

### 2. Database
- ✅ MongoDB Atlas database `harga_pasar_mongo`
- ✅ Semua collections: `users`, `sessions`, `laporan`, `harga`, dll
- ✅ Data yang sudah akurat

### 3. Frontend Apps
- ✅ `web-admin/` (React admin dashboard)
- ✅ `aplikasi-mobile/` (React Native mobile app)

### 4. Deployment Configs (akan di-review)
- ⚠️ `vercel.json` - akan disederhanakan
- ⚠️ `netlify.toml` - akan disederhanakan

---

## 🗑️ YANG AKAN DIHAPUS

### 1. Backend API Files (akan dibuat ulang clean)
```
❌ api/node/
   - auth-login.js
   - auth-logout.js
   - auth-me.js
   - test-env.js
   - _mongo.js
   
❌ api/php/
   - index.php
```

### 2. PHP Backend (duplikat, tidak dipakai)
```
❌ php-backend/
   - Seluruh folder
```

### 3. Debug & Test Files
```
❌ test-auth-endpoint.ps1
❌ test-cors.ps1
❌ test-dataapi.js
❌ wait-and-test.ps1
❌ quick-test.ps1
```

### 4. Documentation Files (outdated/konflik)
```
❌ API-AUTH-DOCS.md
❌ API-AUTH-DOCS.md.example
❌ CHECKLIST.md
❌ ENV-SETUP-NOW.md
❌ ENVIRONMENT-SETUP.md
❌ ENVIRONMENT-SETUP.md.example
❌ FIX-CORS-NOW.md
❌ SETUP-ENV-VARS-NOW.md
❌ TROUBLESHOOTING.md
❌ QUICK-FIX.md (file ini akan diganti dengan dokumentasi baru)
```

### 5. Scripts (debugging, akan dibuat ulang)
```
❌ scripts/check-ids.js
❌ scripts/check-users.js
❌ scripts/fix-laporan.js
❌ scripts/list-all.js
❌ scripts/list-mongo.js
```

### 6. Folders (tidak terpakai)
```
❌ refrensi/
❌ secrets/ (jika ada file di dalamnya)
❌ uploads/ (jika temporary)
```

---

## 🔨 RENCANA REBUILD - FASE 1: CLEANUP

### Step 1: Backup Current State
```powershell
# Create backup branch
git checkout -b backup-before-reset
git push origin backup-before-reset

# Kembali ke main
git checkout main
```

### Step 2: Hapus Files
```powershell
# Hapus backend API
Remove-Item -Recurse -Force api/

# Hapus PHP backend duplikat
Remove-Item -Recurse -Force php-backend/

# Hapus debugging files
Remove-Item -Force test-*.ps1, quick-test.ps1, test-dataapi.js, wait-and-test.ps1

# Hapus documentation files (outdated)
Remove-Item -Force API-AUTH-DOCS.md*, CHECKLIST.md, ENV-SETUP-NOW.md, ENVIRONMENT-SETUP.md*, FIX-CORS-NOW.md, SETUP-ENV-VARS-NOW.md, TROUBLESHOOTING.md, QUICK-FIX.md

# Hapus scripts debugging
Remove-Item -Recurse -Force scripts/

# Hapus folders tidak terpakai
Remove-Item -Recurse -Force refrensi/, secrets/, uploads/
```

### Step 3: Commit Clean State
```powershell
git add -A
git commit -m "Clean: Remove all backend code and debug files - fresh start"
git push origin main
```

---

## 🏗️ RENCANA REBUILD - FASE 2: BUILD CLEAN BACKEND

### Architecture Baru (Simple & Clean)

```
api/
  auth.js          → Handle semua /auth/* endpoints (login, logout, me)
  data.js          → Handle semua /api/data/* endpoints
  markets.js       → Handle /api/markets
  utils/
    mongo.js       → MongoDB connection utility
    cors.js        → CORS utility
    auth.js        → Auth middleware
```

### Teknologi Stack:
- **Database:** MongoDB Atlas (existing)
- **Auth:** JWT token-based (simple, no sessions)
- **API:** Node.js serverless functions
- **Deployment:** Vercel (backend), Netlify (frontend)

### Kenapa Lebih Baik:
1. ✅ **Simple:** 3-4 files saja vs 15+ files
2. ✅ **Clean:** No duplicate, no debugging code
3. ✅ **Stable:** JWT tidak butuh session storage
4. ✅ **Fast:** Tidak ada native module issues
5. ✅ **Maintainable:** Easy to understand dan modify

---

## 🔧 RENCANA REBUILD - FASE 3: IMPLEMENT

### File 1: `api/utils/mongo.js`
```javascript
// Simple MongoDB connection utility
import { MongoClient } from 'mongodb';

let cachedClient = null;

export async function connectDB() {
  if (cachedClient) return cachedClient;
  
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  cachedClient = client;
  return client;
}

export async function getDB() {
  const client = await connectDB();
  return client.db(process.env.MONGODB_DB);
}
```

### File 2: `api/utils/cors.js`
```javascript
// CORS utility
export function setCorsHeaders(req) {
  const origin = req.headers.origin || '';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  if (allowedOrigins.some(o => origin.includes(o))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  
  return {};
}

export function handleCors(req, res) {
  const headers = setCorsHeaders(req);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
```

### File 3: `api/auth.js` (main auth endpoint)
```javascript
// Handle /auth/login, /auth/logout, /auth/me
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from './utils/mongo.js';
import { handleCors } from './utils/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  
  const path = req.url.split('?')[0];
  
  if (path === '/auth/login' && req.method === 'POST') {
    return handleLogin(req, res);
  }
  
  if (path === '/auth/me' && req.method === 'GET') {
    return handleMe(req, res);
  }
  
  if (path === '/auth/logout' && req.method === 'POST') {
    return handleLogout(req, res);
  }
  
  res.status(404).json({ error: 'Not found' });
}

async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;
    const db = await getDB();
    const user = await db.collection('users').findOne({ username });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleMe(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function handleLogout(req, res) {
  // JWT tidak perlu server-side logout
  res.json({ message: 'Logged out' });
}
```

---

## 📋 CHECKLIST EKSEKUSI

### Fase 1: Backup & Cleanup
- [ ] Backup ke branch `backup-before-reset`
- [ ] Hapus semua files yang sudah ditentukan
- [ ] Commit "Clean: Remove all backend code"
- [ ] Push ke GitHub
- [ ] Verify di Vercel (deployment akan fail - expected)

### Fase 2: Setup Clean Structure
- [ ] Create `api/utils/` folder
- [ ] Create `package.json` minimal (jwt, bcryptjs, mongodb)
- [ ] Create `.vercelignore` (exclude unnecessary files)
- [ ] Create `vercel.json` simple routing

### Fase 3: Implement Auth
- [ ] Create `api/utils/mongo.js`
- [ ] Create `api/utils/cors.js`
- [ ] Create `api/auth.js`
- [ ] Add JWT_SECRET to Vercel env vars

### Fase 4: Test & Deploy
- [ ] Test locally (jika perlu)
- [ ] Commit & push
- [ ] Test di production
- [ ] Test login dari web-admin

### Fase 5: Documentation
- [ ] Create `README.md` baru (simple & accurate)
- [ ] Create `API-DOCS.md` (clean API documentation)
- [ ] Delete `RESET-PLAN.md` (this file)

---

## ⚠️ IMPORTANT NOTES

1. **Jangan hapus `.env` file** - ini berisi credentials lokal
2. **MongoDB data tetap aman** - kita hanya hapus backend code
3. **Frontend tetap jalan** - hanya backend yang di-reset
4. **Backup branch tersedia** - bisa rollback jika perlu
5. **JWT_SECRET baru** - akan di-generate untuk keamanan

---

## 🎯 HASIL AKHIR (Expected)

### Structure Baru:
```
proyek-hargapangan/
├── api/
│   ├── auth.js              ← Single auth endpoint
│   ├── data.js              ← Data API endpoint (akan dibuat)
│   └── utils/
│       ├── mongo.js         ← DB utility
│       ├── cors.js          ← CORS utility
│       └── auth.js          ← Auth middleware
├── aplikasi-mobile/         ← Existing (no change)
├── web-admin/               ← Existing (no change)
├── package.json             ← Clean dependencies
├── vercel.json              ← Simple routing
├── .env                     ← Existing (no change)
├── README.md                ← New documentation
└── API-DOCS.md              ← New API docs
```

### Benefits:
- ✅ **3 files** backend (vs 15+ sebelumnya)
- ✅ **No debugging files** (clean repo)
- ✅ **No duplicate code** (php-backend gone)
- ✅ **JWT-based auth** (simpler, no sessions)
- ✅ **Clear documentation** (no konflik docs)
- ✅ **Easy to maintain** (minimal code)

---

## 🚀 READY TO START?

**Konfirmasi sebelum mulai:**
1. ✅ Sudah backup semua data penting?
2. ✅ Sudah yakin mau hapus backend lama?
3. ✅ Siap rebuild dari awal?

**Jika YA, saya akan:**
1. Backup ke branch `backup-before-reset`
2. Hapus semua files yang ditentukan
3. Commit clean state
4. Build backend baru (simple & clean)
5. Test & deploy

**Estimasi waktu:** 15-20 menit

**Konfirmasi:** Ketik **"YA, MULAI RESET"** jika sudah siap! 🚀
