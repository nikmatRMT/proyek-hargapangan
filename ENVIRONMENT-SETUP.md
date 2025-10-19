# Environment Variables Setup

## Vercel Environment Variables

Buka **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Tambahkan variable berikut:

### 1. MongoDB URI (untuk Node.js endpoints)
```
Name: MONGODB_URI
Value: mongodb+srv://Vercel-Admin-proyek-hargapangan:M6xSwPrwTctMFtLi@proyek-hargapangan.jcfbfhs.mongodb.net/?retryWrites=true&w=majority
Environment: Production, Preview, Development
```

### 2. MongoDB Database Name
```
Name: MONGODB_DB
Value: harga_pasar_mongo
Environment: Production, Preview, Development
```

### 3. MongoDB Data API URL (untuk PHP endpoints - fallback)
```
Name: MONGODB_DATA_API_URL
Value: https://data.mongodb-api.com/app/data-vuzikpv/endpoint/data/v1
Environment: Production, Preview, Development
```

### 4. MongoDB Data API Key
```
Name: MONGODB_DATA_API_KEY
Value: BxQ7WWQlW5LymOq7BJjvdC2LE3GX8j3EtkOo0sJQUaTaHxJe2g1CbZ4UPTGRrmPF
Environment: Production, Preview, Development
```

### 5. MongoDB Data Source
```
Name: MONGODB_DATA_SOURCE
Value: proyek-hargapangan
Environment: Production, Preview, Development
```

### 6. Allowed Origins (untuk CORS)
```
Name: ALLOWED_ORIGINS
Value: https://proyek-hargapangan-admin.netlify.app,http://localhost:5173,http://localhost:3000
Environment: Production, Preview, Development
```

### 7. Frontend URL
```
Name: FRONTEND_URL
Value: https://proyek-hargapangan-admin.netlify.app
Environment: Production, Preview, Development
```

---

## Netlify Environment Variables (untuk web-admin)

Buka **Netlify Dashboard** → **Your Site** → **Site settings** → **Environment variables**

Tambahkan variable berikut:

### 1. API Base URL
```
Key: VITE_API_URL
Value: https://proyek-hargapangan.vercel.app
Scopes: All scopes
```

### 2. (Optional) SSE Toggle
```
Key: VITE_USE_SSE
Value: false
Scopes: All scopes
```

---

## Cara Set di Vercel (Step by Step)

1. Login ke https://vercel.com
2. Pilih project **proyek-hargapangan**
3. Klik tab **Settings**
4. Pilih **Environment Variables** di sidebar
5. Klik **Add New**
6. Masukkan:
   - **Name**: nama variable (contoh: `MONGODB_URI`)
   - **Value**: nilai variable
   - **Environment**: pilih semua (Production, Preview, Development)
7. Klik **Save**
8. Ulangi untuk semua variable di atas

**PENTING:** Setelah menambahkan environment variables, Anda perlu **Redeploy** project:
- Go to **Deployments** tab
- Klik menu (3 dots) pada deployment terakhir
- Pilih **Redeploy**

---

## Cara Set di Netlify (Step by Step)

1. Login ke https://app.netlify.com
2. Pilih site **proyek-hargapangan-admin**
3. Klik **Site settings**
4. Pilih **Environment variables** di sidebar
5. Klik **Add a variable**
6. Masukkan:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://proyek-hargapangan.vercel.app`
   - **Scopes**: pilih semua
7. Klik **Create variable**

**PENTING:** Setelah menambahkan variables, trigger rebuild:
- Go to **Deploys** tab
- Klik **Trigger deploy** → **Clear cache and deploy site**

---

## Verifikasi

Setelah set environment variables dan redeploy:

### Test Vercel Backend:
```bash
curl https://proyek-hargapangan.vercel.app/api/markets
curl https://proyek-hargapangan.vercel.app/api/commodities
curl https://proyek-hargapangan.vercel.app/api/prices
```

### Test Netlify Frontend:
Buka browser: `https://proyek-hargapangan-admin.netlify.app`

---

## Troubleshooting

### Jika masih error 500:
1. Pastikan semua env variables sudah terisi dengan benar
2. Redeploy di Vercel
3. Tunggu 1-2 menit untuk deployment selesai
4. Check logs di Vercel Dashboard → **Deployments** → klik deployment → **View Function Logs**

### Jika login endpoint masih error:
- Check apakah `MONGODB_URI` sudah benar
- Pastikan bcryptjs sudah terinstall (cek `package.json`)
- Lihat function logs untuk error detail

---

## Quick Copy-Paste untuk Vercel

```bash
MONGODB_URI=mongodb+srv://Vercel-Admin-proyek-hargapangan:M6xSwPrwTctMFtLi@proyek-hargapangan.jcfbfhs.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=harga_pasar_mongo
MONGODB_DATA_API_URL=https://data.mongodb-api.com/app/data-vuzikpv/endpoint/data/v1
MONGODB_DATA_API_KEY=BxQ7WWQlW5LymOq7BJjvdC2LE3GX8j3EtkOo0sJQUaTaHxJe2g1CbZ4UPTGRrmPF
MONGODB_DATA_SOURCE=proyek-hargapangan
ALLOWED_ORIGINS=https://proyek-hargapangan-admin.netlify.app,http://localhost:5173,http://localhost:3000
FRONTEND_URL=https://proyek-hargapangan-admin.netlify.app
```

## Quick Copy-Paste untuk Netlify

```bash
VITE_API_URL=https://proyek-hargapangan.vercel.app
VITE_USE_SSE=false
```
