# 🌾 Proyek Harga Pangan

**Clean & Simple Backend API** untuk sistem informasi harga pangan dengan frontend React.

**Version:** 2.0.0 (Clean Reset - October 2025)

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

2. **Install dependencies:**
```bash
# Backend dependencies
npm install

# Web admin (in separate terminal)
cd web-admin
npm install
```

3. **Setup environment variables:**
```bash
# Copy .env.example
cp .env.example .env

# Edit .env with your MongoDB credentials
# See API-DOCS.md for required variables
```

4. **Run local development:**
```bash
# Backend (Vercel CLI)
vercel dev

# Web admin (in separate terminal)
cd web-admin
npm run dev
```

5. **Open in browser:**
- Backend: http://localhost:3000
- Web Admin: http://localhost:5173

---

## 📁 Project Structure

```
proyek-hargapangan/
├── api/
│   ├── auth.js           # 🔐 All auth endpoints (login, me, logout)
│   └── utils/
│       ├── mongo.js      # 🗄️  MongoDB connection utility
│       ├── cors.js       # 🌐 CORS handling
│       └── auth.js       # 🔑 JWT authentication utility
├── web-admin/            # 💻 React admin dashboard (Netlify)
├── aplikasi-mobile/      # 📱 React Native mobile app
├── docs/                 # 📚 Documentation
│   ├── API-DOCS.md       # API documentation
│   ├── SETUP-JWT-SECRET.md # JWT setup guide
│   ├── SECURITY.md       # Security guidelines
│   └── RESET-PLAN.md     # Reset documentation
├── package.json          # 📦 Node.js dependencies
├── vercel.json           # ⚙️  Vercel configuration
├── netlify.toml          # ⚙️  Netlify configuration
└── README.md             # 📖 This file
```

**Key Features:**
- ✅ **Simple:** Only 3 backend files (was 15+)
- ✅ **Clean:** No duplicate code, no debugging files
- ✅ **JWT-based:** No session storage needed
- ✅ **Serverless:** Vercel functions (auto-scaling)

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

### Authentication (JWT-based)
- `POST /auth/login` - Login (returns JWT token)
- `GET /auth/me` - Get current user (requires token)
- `POST /auth/logout` - Logout (client-side token removal)

**📖 Full API Documentation:** See `docs/API-DOCS.md`

### Quick Example:
```javascript
// Login
const { token } = await fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin', password: 'pass' })
}).then(r => r.json());

// Use token in subsequent requests
fetch('/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🗄️ Database

### MongoDB Atlas Collections:
- `users` - User accounts (with bcrypt hashed passwords)
- `pasar` - Markets data
- `komoditas` - Commodities data
- `laporan_harga` - Price reports

**Note:** JWT-based auth doesn't need `sessions` collection (stateless).

---

## 🐛 Troubleshooting

### Common Issues:

1. **"No token provided"**
   - Include `Authorization: Bearer <token>` header in requests
   - Check token expiration (7 days validity)

2. **"Invalid credentials"**
   - Verify username and password
   - Check user exists in MongoDB `users` collection
   - Ensure password is bcrypt hashed

3. **CORS Error**
   - Verify origin is in `ALLOWED_ORIGINS` env var
   - Check Vercel environment variables
   - Redeploy after changing env vars

4. **"JWT_SECRET environment variable is not set"**
   - Add `JWT_SECRET` to Vercel (min 32 chars)
   - Generate: `openssl rand -base64 32`

**📖 Full Docs:** See `docs/API-DOCS.md` for detailed troubleshooting

---

## 📚 Documentation

- `README.md` (this file) - Project overview & quick start
- `docs/API-DOCS.md` - Complete API documentation & examples
- `docs/SETUP-JWT-SECRET.md` - JWT secret setup instructions
- `docs/SECURITY.md` - Security guidelines & incident response
- `docs/RESET-PLAN.md` - Project reset documentation
- `.env.example` - Environment variables template

---

## 📝 Environment Variables

### Vercel (Backend)
```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB=harga_pasar_mongo

# JWT Authentication
JWT_SECRET=your-super-secret-key-min-32-characters

# CORS
ALLOWED_ORIGINS=https://proyek-hargapangan-admin.netlify.app,netlify.app,localhost:5173
```

### Netlify (Frontend)
```bash
VITE_API_URL=https://proyek-hargapangan.vercel.app
```

**📖 See:** `docs/API-DOCS.md` for detailed setup instructions

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes
4. Test locally: `vercel dev`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Create Pull Request

**⚠️ Before commit:**
- Check for sensitive data: `git diff`
- Verify `.env` files not included
- See `docs/SECURITY.md` for guidelines

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
