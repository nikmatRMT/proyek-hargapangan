# Sequence Diagram Lengkap (Mermaid)

Copy kode di bawah ini dan paste di **[Mermaid Live Editor](https://mermaid.live/)** atau **Draw.io** (Insert > Advanced > Mermaid) untuk download sebagai PNG/SVG.

```mermaid
sequenceDiagram
    autonumber
    actor Petugas as Petugas Lapangan
    participant Web as Web App (Frontend)
    participant API as API Server (Backend)
    participant DB as Database (MongoDB)
    actor Admin as Admin DKP3

    rect rgb(240, 248, 255)
    note right of Petugas: 1. PROSES LOGIN / OTENTIKASI
    Petugas->>Web: Buka Halaman Login
    Web-->>Petugas: Tampilkan Form Login
    Petugas->>Web: Input Username & Password
    Web->>API: POST /api/auth/login
    API->>DB: findUser(username)
    DB-->>API: Return User Data
    
    alt Kredensial Valid
        API-->>Web: Return Token (JWT)
        Web-->>Petugas: Redirect Dashboard
    else Kredensial Salah
        API-->>Web: Return Error Message
        Web-->>Petugas: Tampilkan Pesan Error
    end
    end

    rect rgb(255, 250, 240)
    note right of Petugas: 2. PROSES INPUT DATA HARGA
    Petugas->>Web: Buka Menu Input Data
    Web->>API: GET Markets & Commodities
    API-->>Web: Return Master Data
    Petugas->>Web: Input Harga & Upload Foto Bukti
    Petugas->>Web: Klik Simpan
    Web->>API: POST /api/prices
    API->>API: Validasi Kelengkapan Data
    
    alt Data Valid
        API->>DB: insertMany(prices)
        DB-->>API: Acknowledge Write
        API-->>Web: Return {success: true}
        Web-->>Petugas: Tampilkan Notifikasi Sukses
    else Data Tidak Valid
        API-->>Web: Return Error Details
        Web-->>Petugas: Tampilkan Alert Perbaikan
    end
    end

    rect rgb(240, 255, 240)
    note right of Admin: 3. PROSES MONITORING & LAPORAN
    Admin->>Web: Login & Akses Dashboard
    Web->>API: GET /api/prices (Dashboard Data)
    API->>DB: Aggregate Data (Avg, Trends)
    DB-->>API: Return Aggregated Data
    API-->>Web: Return JSON Data
    Web-->>Admin: Tampilkan Grafik Real-time (Chart.js)
    
    Admin->>Web: Buka Output Manager
    Admin->>Web: Filter Tanggal/Pasar & Klik Export
    Web->>Web: Generate Excel (Library exceljs)
    Web-->>Admin: Download File Laporan (.xlsx)
    end
```
