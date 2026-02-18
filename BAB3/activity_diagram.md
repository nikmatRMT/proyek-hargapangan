# Activity Diagram - HARPA BANUA

## 1. Activity Diagram Login

Copy ke Draw.io → Arrange → Insert → Advanced → Mermaid

```mermaid
flowchart TD
    subgraph Admin/Petugas
        A1((●)) --> A2[Membuka Web]
        A2 --> A3[Input Username & Password]
        A3 --> A8[Masuk Dashboard]
        A8 --> A9((◎))
    end
    
    subgraph Sistem
        S1{Sync} --> S2[Menampilkan Form Login]
        S2 --> S3[Validasi Data]
        S3 --> S4{Data Valid?}
        S4 -->|Ya| S5[Buat Session]
        S4 -->|Tidak| S6[Tampilkan Pesan Error]
        S6 --> S1
    end
    
    A2 --> S1
    S2 --> A3
    S5 --> A8
```

---

## 2. Activity Diagram Input Harga

```mermaid
flowchart TD
    subgraph Petugas
        P1((●)) --> P2[Buka Menu Input Data]
        P2 --> P3[Pilih Tanggal & Pasar]
        P3 --> P4[Input Harga Komoditas]
        P4 --> P5[Upload Foto Bukti]
        P5 --> P6[Klik Simpan]
        P6 --> P9[Lihat Notifikasi Sukses]
        P9 --> P10((◎))
    end
    
    subgraph Sistem
        S1[Tampilkan Form Input] --> S2[Terima Data]
        S2 --> S3[Validasi Data]
        S3 --> S4{Data Valid?}
        S4 -->|Ya| S5[Simpan ke MongoDB]
        S4 -->|Tidak| S6[Tampilkan Error]
        S6 --> S1
        S5 --> S7[Kirim Notifikasi]
    end
    
    P2 --> S1
    P6 --> S2
    S7 --> P9
```

---

## 3. Activity Diagram Export Laporan

```mermaid
flowchart TD
    subgraph Admin
        A1((●)) --> A2[Buka Output Manager]
        A2 --> A3[Set Filter Tanggal & Pasar]
        A3 --> A4[Klik Tombol Filter]
        A4 --> A5[Lihat Data Tabel]
        A5 --> A6[Pilih Export Excel/PDF]
        A6 --> A7[Download File]
        A7 --> A8((◎))
    end
    
    subgraph Sistem
        S1[Tampilkan Halaman] --> S2[Query Database]
        S2 --> S3[Tampilkan Data ke Tabel]
        S3 --> S4[Generate File Excel/PDF]
        S4 --> S5[Trigger Download Browser]
    end
    
    A2 --> S1
    A4 --> S2
    S3 --> A5
    A6 --> S4
    S5 --> A7
```

---

## 4. Activity Diagram Kelola Pasar

```mermaid
flowchart TD
    subgraph Admin
        A1((●)) --> A2[Buka Menu Kelola Pasar]
        A2 --> A3[Lihat Daftar Pasar]
        A3 --> A4{Aksi?}
        A4 -->|Tambah| A5[Input Data Pasar Baru]
        A4 -->|Edit| A6[Ubah Data Pasar]
        A4 -->|Hapus| A7[Konfirmasi Hapus]
        A5 --> A8[Klik Simpan]
        A6 --> A8
        A7 --> A9[Klik Hapus]
        A8 --> A10[Lihat Notifikasi]
        A9 --> A10
        A10 --> A11((◎))
    end
    
    subgraph Sistem
        S1[Ambil Data dari DB] --> S2[Tampilkan ke Tabel]
        S2 --> S3[Proses CRUD]
        S3 --> S4{Sukses?}
        S4 -->|Ya| S5[Update Tampilan]
        S4 -->|Tidak| S6[Tampilkan Error]
    end
    
    A2 --> S1
    A8 --> S3
    A9 --> S3
    S5 --> A10
```

---

## 5. Activity Diagram Riwayat Survey

```mermaid
flowchart TD
    subgraph Admin/Petugas
        A1((●)) --> A2[Buka Menu Riwayat Survey]
        A2 --> A3[Lihat Daftar Survey]
        A3 --> A4[Filter Berdasarkan Petugas]
        A4 --> A5[Filter Berdasarkan Tanggal]
        A5 --> A6[Lihat Detail Survey]
        A6 --> A7{Export?}
        A7 -->|Ya| A8[Pilih Format Excel/PDF]
        A7 -->|Tidak| A9((◎))
        A8 --> A10[Download File]
        A10 --> A9
    end
    
    subgraph Sistem
        S1[Query Riwayat dari DB] --> S2[Group by Petugas & Tanggal]
        S2 --> S3[Tampilkan ke Tabel]
        S3 --> S4[Generate File Export]
    end
    
    A2 --> S1
    S3 --> A3
    A8 --> S4
    S4 --> A10
```

---

## Cara Menggunakan

### Opsi 1: Draw.io
1. Buka **app.diagrams.net**
2. Klik **Arrange → Insert → Advanced → Mermaid**
3. Copy kode di atas (tanpa ```)
4. Klik **Insert**

### Opsi 2: Mermaid Live Editor
1. Buka **mermaid.live**
2. Paste kode Mermaid
3. Download sebagai PNG/SVG

### Opsi 3: PlantUML
1. Buka **plantuml.com/plantuml**
2. Convert ke format PlantUML

---

## Keterangan Simbol

| Simbol | Nama | Keterangan |
|--------|------|------------|
| ((●)) | Start | Titik awal aktivitas |
| ((◎)) | End | Titik akhir aktivitas |
| [ ] | Action | Proses/aktivitas |
| { } | Decision | Percabangan keputusan |
| --> | Arrow | Alur proses |
