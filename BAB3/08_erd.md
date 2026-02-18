# 8. Entity Relationship Diagram (ERD)

---

## 8.1 ERD Konseptual

```mermaid
erDiagram
    PASAR {
        int id PK
        string nama_pasar UK
        string alamat
        datetime created_at
        datetime updated_at
    }
    
    KOMODITAS {
        int id PK
        string nama_komoditas UK
        string unit
        datetime created_at
        datetime updated_at
    }
    
    LAPORAN_HARGA {
        int id PK
        string tanggal_lapor
        int market_id FK
        int komoditas_id FK
        int user_id FK
        int harga
        string keterangan
        string foto_url
        string gps_url
        datetime created_at
        datetime updated_at
    }
    
    USERS {
        int id PK
        string nip UK
        string nama_lengkap
        string username UK
        string password
        string role
        int is_active
        string foto
        datetime created_at
        datetime updated_at
    }
    
    PASAR ||--o{ LAPORAN_HARGA : "memiliki"
    KOMODITAS ||--o{ LAPORAN_HARGA : "memiliki"
    USERS ||--o{ LAPORAN_HARGA : "menginput"
```

---

## 8.2 ERD Fisik dengan Kardinalitas

```mermaid
erDiagram
    PASAR ||--o{ LAPORAN_HARGA : "1:N"
    KOMODITAS ||--o{ LAPORAN_HARGA : "1:N"
    USERS ||--o{ LAPORAN_HARGA : "1:N"
    
    PASAR {
        int id PK "auto-increment"
        varchar nama_pasar "NOT NULL, UNIQUE"
        varchar alamat "NULL"
        timestamp created_at
        timestamp updated_at
    }
    
    KOMODITAS {
        int id PK "auto-increment"
        varchar nama_komoditas "NOT NULL, UNIQUE"
        varchar unit "DEFAULT Rp/Kg"
        timestamp created_at
        timestamp updated_at
    }
    
    LAPORAN_HARGA {
        int id PK "auto-increment"
        date tanggal_lapor "NOT NULL"
        int market_id FK "NOT NULL"
        int komoditas_id FK "NOT NULL"
        int user_id FK "NULL, petugas penginput"
        int harga "NOT NULL"
        text keterangan "NULL"
        varchar foto_url "NULL"
        varchar gps_url "NULL"
        timestamp created_at
        timestamp updated_at
    }
    
    USERS {
        int id PK "auto-increment"
        char_18 nip "UNIQUE"
        varchar nama_lengkap "NOT NULL"
        varchar username "NOT NULL, UNIQUE"
        varchar password "NOT NULL hash"
        enum role "admin or petugas"
        tinyint is_active "DEFAULT 1"
        varchar foto "NULL"
        timestamp created_at
        timestamp updated_at
    }
```

---

## 8.3 Relasi dan Constraint

| Relasi | Parent | Child | Kardinalitas | On Delete |
|--------|--------|-------|--------------|-----------|
| FK_market | `pasar` | `laporan_harga` | 1:N | RESTRICT |
| FK_komoditas | `komoditas` | `laporan_harga` | 1:N | RESTRICT |
| FK_user | `users` | `laporan_harga` | 1:N | SET NULL |

> **Catatan**: MongoDB tidak memiliki foreign key constraint bawaan. Validasi relasi dilakukan di level aplikasi.
