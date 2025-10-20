# HARPA BANUA 🌾

**Sistem Informasi Harga Pangan Indonesia**

Aplikasi terintegrasi untuk monitoring, pelaporan, dan analisis harga pangan di pasar-pasar Indonesia.

## 🏗️ Struktur Project

```
proyek-hargapangan/
├── web-admin/           # Dashboard Admin (React + Vite + TypeScript)
├── harga-backend/       # API Backend (Express.js + MongoDB)
└── aplikasi-mobile/     # Aplikasi Mobile (React Native + Expo)
```

## 🚀 Deployment

- **Frontend (web-admin)**: https://harpa-banua.vercel.app
- **Backend (harga-backend)**: Hosted on Vercel (same domain)
- **Database**: MongoDB Atlas

## 📋 Fitur

- ✅ Dashboard monitoring harga real-time
- ✅ Import data harga dari Excel
- ✅ Manajemen user & pasar
- ✅ Laporan harga per komoditas
- ✅ API untuk aplikasi mobile
- ✅ Autentikasi berbasis session

## 🛠️ Tech Stack

### Frontend
- React 19
- Vite 7
- TypeScript
- TailwindCSS
- Recharts (visualisasi)
- ExcelJS (import/export)

### Backend
- Node.js 18+
- Express.js
- MongoDB 6.9+
- Express-session + connect-mongo
- Multer (file upload)
- Bcrypt (password hashing)

### Infrastructure
- Vercel (Frontend + Backend)
- MongoDB Atlas (Database)

## 📝 Lisensi

Copyright © 2024. All rights reserved.

---

**Dibuat untuk Sistem Informasi Harga Pangan**
