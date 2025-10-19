# proyek-hargapangan

Backend PHP + Node.js serverless untuk sistem informasi harga pangan, dengan frontend React di Netlify.

## 🚀 Quick Start

### Prerequisites
- PHP 8+
- Node.js 16+
- Composer
- MongoDB Atlas account

### Local Development

1. **Clone repository:**
```bash
git clone https://github.com/nikmatRMT/proyek-hargapangan.git
cd proyek-hargapangan
```

2. **Setup credentials (PENTING!):**
```bash
# Copy template files
cp API-AUTH-DOCS.md.example API-AUTH-DOCS.md
cp ENVIRONMENT-SETUP.md.example ENVIRONMENT-SETUP.md

# Edit file dengan credentials asli (minta dari admin)
# JANGAN commit file ini ke Git!
```

3. **Install dependencies:**
```bash
# PHP backend
composer install

# Node.js functions
npm install

# Web admin
cd web-admin
npm install
```

4. **Setup environment variables:**
```bash
# Copy .env.example
cp .env.example .env

# Edit .env dengan MongoDB credentials Anda
# Lihat ENVIRONMENT-SETUP.md untuk detail
```

5. **Run local server:**
```bash
# PHP backend
php -S localhost:4000 -t php-backend/public

# Web admin (di terminal terpisah)
cd web-admin
npm run dev
```

---

## 📁 Project Structure

```
├── api/
│   ├── php/              # PHP serverless endpoints (Vercel)
│   └── node/             # Node.js serverless endpoints (Vercel)
├── php-backend/          # PHP source code
│   ├── src/              # Core classes (DataStore, ExcelLoader, MongoBridge)
│   └── public/           # Public entry point
├── web-admin/            # React admin dashboard (Netlify)
├── scripts/              # Utility scripts (MongoDB management)
├── vendor/               # Composer dependencies
├── .gitignore            # Git ignore rules (includes sensitive files!)
└── SECURITY.md           # ⚠️ READ THIS for security guidelines
```

---

## 🔐 Security & Configuration

### ⚠️ CRITICAL FILES (DO NOT COMMIT!)

File berikut mengandung **credentials sensitif** dan sudah di-exclude dari Git:
- `API-AUTH-DOCS.md` - Real credentials
- `ENVIRONMENT-SETUP.md` - MongoDB URIs & API keys
- `.env` files (except `.env.example`)

### ✅ Safe Template Files (OK to commit)
- `API-AUTH-DOCS.md.example`
- `ENVIRONMENT-SETUP.md.example`
- `.env.example`

**📖 Baca:** `SECURITY.md` untuk panduan lengkap security best practices

---

## 🌐 Deployment

### Backend (Vercel)
- **URL:** https://proyek-hargapangan.vercel.app
- **Endpoints:** PHP + Node.js serverless functions
- **Setup:** Ikuti `ENVIRONMENT-SETUP.md.example`

### Frontend (Netlify)
- **URL:** https://proyek-hargapangan-admin.netlify.app
- **Framework:** React + Vite + TypeScript
- **Setup:** Set `VITE_API_URL` di Netlify dashboard

---

## 📡 API Endpoints

### Public Endpoints (PHP)
- `GET /api/markets` - Daftar pasar
- `GET /api/commodities` - Daftar komoditas
- `GET /api/prices` - Data harga (supports filtering)
- `PATCH /api/prices/:id` - Update harga
- `POST /api/prices/upsert` - Upsert by key

### Authentication Endpoints (Node.js)
- `POST /auth/login` - Login (returns token)
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Import/Export
- `POST /api/import-excel/upload` - Upload Excel file
- `POST /api/import-excel/bulk` - Bulk import multi-month

**📖 API Documentation:** `API-AUTH-DOCS.md.example`

---

## 🗄️ Database

### MongoDB Collections:
- `users` - User accounts
- `sessions` - Authentication sessions
- `pasar` - Markets data
- `komoditas` - Commodities data
- `laporan_harga` - Price reports

### Fallback:
Jika MongoDB tidak tersedia, backend otomatis fallback ke Excel files di `server/data/`.

---

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Error:**
   - Set `ALLOWED_ORIGINS` di Vercel environment variables
   - Lihat: `TROUBLESHOOTING.md`

2. **Login Failed:**
   - Check MongoDB connection
   - Verify `MONGODB_URI` di Vercel dashboard
   - Check credentials di `API-AUTH-DOCS.md` (local only)

3. **Double `/api/api/` in URL:**
   - Fix `VITE_API_URL` di Netlify (remove trailing `/api`)
   - Redeploy Netlify

**📖 Full Guide:** `TROUBLESHOOTING.md`

---

## 📚 Documentation

- `README.md` (this file) - Project overview
- `SECURITY.md` - ⚠️ Security guidelines & incident response
- `TROUBLESHOOTING.md` - Common issues & solutions
- `API-AUTH-DOCS.md.example` - API documentation template
- `ENVIRONMENT-SETUP.md.example` - Environment setup guide

---

## 🛠️ Development Scripts

```bash
# Check MongoDB data integrity
node scripts/check-ids.js

# List all MongoDB documents
node scripts/list-all.js

# Check users collection
node scripts/check-users.js

# Fix laporan_harga data
node scripts/fix-laporan.js
```

---

## 📝 Environment Variables

### Vercel (Backend)
```bash
MONGODB_URI=<your_mongodb_uri>
MONGODB_DB=harga_pasar_mongo
MONGODB_DATA_API_URL=<data_api_url>
MONGODB_DATA_API_KEY=<api_key>
MONGODB_DATA_SOURCE=<cluster_name>
ALLOWED_ORIGINS=<netlify_url>,http://localhost:5173
FRONTEND_URL=<netlify_url>
```

### Netlify (Frontend)
```bash
VITE_API_URL=https://proyek-hargapangan.vercel.app
VITE_USE_SSE=false
```

**📖 Detailed Setup:** `ENVIRONMENT-SETUP.md.example`

---

## 🤝 Contributing

1. Clone repository
2. Setup credentials (minta dari admin - JANGAN commit!)
3. Create feature branch
4. Make changes
5. **IMPORTANT:** Review commits untuk pastikan tidak ada credentials!
6. Submit pull request

**Before commit:**
```bash
# Check for sensitive data
git diff

# Verify .gitignore working
git status

# See: SECURITY.md for checklist
```

---

## 📞 Support

- **Issues:** https://github.com/nikmatRMT/proyek-hargapangan/issues
- **Security Issues:** Lihat `SECURITY.md` untuk incident response
- **Documentation:** Check semua `.md` files di root project

---

## 📄 License

© 2024-2025 DKP3 Banjarbaru. All rights reserved.

---

**Last Updated:** October 19, 2025  
**Version:** 2.0.0
