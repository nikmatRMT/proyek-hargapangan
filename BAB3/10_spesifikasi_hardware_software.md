# Usulan Spesifikasi Hardware dan Software

## A. Spesifikasi Server (Backend & Database)

### 1. Spesifikasi Minimum Server

| Komponen | Spesifikasi Minimum | Rekomendasi |
|----------|---------------------|-------------|
| Processor | 2 Core CPU | 4 Core CPU |
| RAM | 2 GB | 4 GB |
| Storage | 20 GB SSD | 50 GB SSD |
| Bandwidth | 1 TB/bulan | Unlimited |
| Sistem Operasi | Ubuntu 20.04 LTS / Windows Server 2019 | Ubuntu 22.04 LTS |

### 2. Software Server

| Komponen | Versi | Keterangan |
|----------|-------|------------|
| Node.js | v18.x atau lebih tinggi | Runtime JavaScript |
| NPM | v9.x atau lebih tinggi | Package Manager |
| MongoDB | v6.x (Atlas) | Database NoSQL berbasis cloud |
| Git | v2.x | Version Control |
| PM2 | v5.x | Process Manager untuk Node.js |
| Nginx | v1.x (Opsional) | Reverse Proxy & Load Balancer |

### 3. Layanan Cloud yang Digunakan

| Layanan | Provider | Fungsi |
|---------|----------|--------|
| Database | MongoDB Atlas | Penyimpanan data (Free Tier tersedia) |
| File Storage | Vercel Blob | Penyimpanan foto bukti survei |
| Hosting Backend | Railway / Render / VPS | Server API |
| Hosting Frontend | Vercel / Netlify | Hosting Web Admin |

---

## B. Spesifikasi Client (Pengguna)

### 1. Admin DKP3 (Web Desktop)

| Komponen | Spesifikasi Minimum | Rekomendasi |
|----------|---------------------|-------------|
| Processor | Intel Core i3 / AMD Ryzen 3 | Intel Core i5 / AMD Ryzen 5 |
| RAM | 4 GB | 8 GB |
| Storage | 128 GB | 256 GB SSD |
| Layar | 14 inch, 1366 x 768 | 15.6 inch, 1920 x 1080 |
| Koneksi | Internet min 5 Mbps | Internet 10 Mbps+ |
| Browser | Chrome / Firefox / Edge (versi terbaru) | Google Chrome |

### 2. Petugas Lapangan (Web Mobile)

| Komponen | Spesifikasi Minimum | Rekomendasi |
|----------|---------------------|-------------|
| Smartphone | Android 8.0+ / iOS 12+ | Android 10+ / iOS 14+ |
| RAM | 2 GB | 4 GB |
| Storage | 16 GB (tersedia 2 GB kosong) | 32 GB |
| Layar | 5 inch | 6 inch+ |
| Kamera | 8 MP | 12 MP+ |
| Koneksi | 4G LTE | 4G LTE / WiFi |
| Browser | Chrome / Safari (versi terbaru) | Google Chrome Mobile |

---

## C. Spesifikasi Jaringan

| Aspek | Kebutuhan |
|-------|-----------|
| Tipe Koneksi | Internet Broadband / 4G LTE |
| Kecepatan Minimum | 5 Mbps (download), 2 Mbps (upload) |
| Protokol | HTTPS (SSL/TLS) |
| Port yang Digunakan | 443 (HTTPS), 80 (HTTP redirect) |
| Firewall | Izinkan akses ke domain aplikasi |

---

## D. Software Development (Pengembangan)

### 1. Tools Pengembangan

| Software | Versi | Fungsi |
|----------|-------|--------|
| Visual Studio Code | Latest | Code Editor |
| Node.js | v18.x+ | Runtime JavaScript |
| Git | v2.x+ | Version Control |
| Postman | Latest | API Testing |
| MongoDB Compass | Latest | Database GUI |

### 2. Framework & Library Utama

#### Frontend (Web Admin & Web Mobile)
| Library | Versi | Fungsi |
|---------|-------|--------|
| React | v19.x | UI Framework |
| TypeScript | v5.x | Type-safe JavaScript |
| Vite | v6.x | Build Tool |
| TailwindCSS | v3.x | CSS Framework |
| Radix UI | Latest | UI Components |
| Recharts | Latest | Grafik & Chart |
| ExcelJS | Latest | Export ke Excel |
| jsPDF | Latest | Export ke PDF |

#### Backend (API Server)
| Library | Versi | Fungsi |
|---------|-------|--------|
| Express.js | v4.x | Web Framework |
| MongoDB Driver | v6.x | Database Connection |
| bcrypt | v5.x | Password Hashing |
| express-session | v1.x | Session Management |
| multer | v1.x | File Upload |
| PDFKit | Latest | Generate PDF |

---

## E. Estimasi Biaya Operasional

### 1. Opsi Gratis (Free Tier)

| Layanan | Provider | Biaya |
|---------|----------|-------|
| Database | MongoDB Atlas (512 MB) | Gratis |
| Hosting Backend | Railway (500 jam/bulan) | Gratis |
| Hosting Frontend | Vercel (100 GB bandwidth) | Gratis |
| File Storage | Vercel Blob (1 GB) | Gratis |
| **Total** | | **Rp 0/bulan** |

### 2. Opsi Berbayar (Produksi)

| Layanan | Provider | Biaya |
|---------|----------|-------|
| Database | MongoDB Atlas (M10) | $57/bulan (~Rp 900.000) |
| VPS Server | DigitalOcean (2 GB) | $12/bulan (~Rp 190.000) |
| Domain | .go.id | Rp 0 (gratis untuk instansi) |
| SSL Certificate | Let's Encrypt | Gratis |
| **Total** | | **~Rp 1.100.000/bulan** |

---

## F. Keamanan Sistem

| Aspek Keamanan | Implementasi |
|----------------|--------------|
| Autentikasi | Session-based dengan bcrypt hashing |
| Otorisasi | Role-based (Admin, Petugas) |
| Enkripsi | HTTPS dengan SSL/TLS |
| Validasi Input | Server-side validation |
| Backup Database | Otomatis oleh MongoDB Atlas |
| Session Timeout | 24 jam (konfigurabel) |

---

## G. Ringkasan Kebutuhan Minimal

### Untuk Deployment Produksi:
1. **1 unit VPS** (2 Core, 2 GB RAM, 20 GB SSD)
2. **Akun MongoDB Atlas** (Free tier cukup untuk awal)
3. **Akun Vercel** (untuk frontend hosting)
4. **Domain** (.go.id untuk instansi pemerintah)
5. **SSL Certificate** (gratis dari Let's Encrypt)

### Untuk Pengguna:
1. **Admin**: Laptop/PC dengan browser modern
2. **Petugas**: Smartphone Android/iOS dengan browser Chrome
3. **Koneksi Internet**: Minimal 4G LTE
