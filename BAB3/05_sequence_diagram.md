# 5. Sequence Diagram

---

## 5.1 Sequence Diagram: Login

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as MongoDB
    
    U->>FE: Masukkan username & password
    FE->>FE: Validasi input
    FE->>API: POST /auth/login
    API->>DB: findOne({ username })
    DB-->>API: User data
    API->>API: bcrypt.compare(password)
    alt Password benar
        API->>API: Buat session
        API-->>FE: { ok: true, user }
        FE->>FE: Simpan ke localStorage
        FE-->>U: Redirect ke halaman utama
    else Password salah
        API-->>FE: { ok: false, message }
        FE-->>U: Tampilkan error
    end
```

---

## 5.2 Sequence Diagram: Input Harga

```mermaid
sequenceDiagram
    autonumber
    actor P as Petugas
    participant FE as Frontend
    participant API as Backend
    participant BLOB as Vercel Blob
    participant DB as MongoDB
    
    P->>FE: Isi form harga
    P->>FE: Ambil foto
    FE->>BLOB: Upload foto
    BLOB-->>FE: foto_url
    P->>FE: Submit
    FE->>API: POST /m/reports
    API->>DB: Cek duplikat
    alt Duplikat
        DB-->>API: Ada data sama
        API-->>FE: { error: duplicate }
        FE-->>P: Warning duplikat
    else Tidak duplikat
        API->>DB: insertOne(laporan)
        DB-->>API: Success
        API-->>FE: { ok: true }
        FE-->>P: Konfirmasi sukses
    end
```

---

## 5.3 Sequence Diagram: Export Excel

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant FE as Frontend
    participant API as Backend
    participant DB as MongoDB
    
    A->>FE: Pilih pasar & tanggal
    A->>FE: Klik Export Excel
    FE->>API: GET /api/export-excel?params
    API->>DB: Query laporan_harga
    DB-->>API: Array data
    API->>API: Generate workbook (ExcelJS)
    API->>API: Format sesuai template
    API-->>FE: Binary file (.xlsx)
    FE-->>A: Download file
```

---

## 5.4 Sequence Diagram: Real-time Update (SSE)

```mermaid
sequenceDiagram
    autonumber
    participant FE1 as Admin Browser
    participant SSE as SSE Server
    participant API as Backend
    participant FE2 as Petugas App
    participant DB as MongoDB
    
    FE1->>SSE: Connect GET /sse/prices
    SSE-->>FE1: event: ready
    
    FE2->>API: POST /m/reports (harga baru)
    API->>DB: Insert data
    DB-->>API: Success
    API->>SSE: bus.emit('prices:changed')
    SSE-->>FE1: event: prices (data baru)
    FE1->>FE1: Update tampilan
```
