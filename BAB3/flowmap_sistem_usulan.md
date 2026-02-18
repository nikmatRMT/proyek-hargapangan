# Flowmap Sistem Usulan - Aplikasi HARPA BANUA

## Diagram Mermaid (Copy ke Draw.io → Advanced → Mermaid)

```mermaid
flowchart TB
    subgraph PETUGAS["═══ PETUGAS LAPANGAN (Web Responsive) ═══"]
        A([Mulai]) --> B[Login via Browser HP]
        B --> C{Login Berhasil?}
        C -->|TIDAK| B
        C -->|YA| D[Survei ke Pasar Tradisional]
        D --> E[Input Harga via Web]
        E --> F[Upload Foto Bukti]
        F --> G[/Kirim Data ke Server/]
    end
    
    subgraph SISTEM["═══ SISTEM HARPA BANUA (Otomatis) ═══"]
        H[(Database MongoDB)] --> I{Data Lengkap? 3 Sampel Harga?}
        I -->|TIDAK| J[Tampilkan Pesan Error]
        I -->|YA| K[Simpan ke Database]
        K --> L[Hitung Rata-rata Otomatis]
        L --> M[Update Dashboard Real-time]
    end
    
    subgraph ADMIN["═══ ADMIN DKP3 (Web Admin) ═══"]
        N[Login Web Admin] --> O[Lihat Dashboard]
        O --> P[Monitor Data Real-time]
        P --> Q[Filter & Analisis Data]
        Q --> R{Perlu Export?}
        R -->|YA| S[/Export Excel/PDF/]
        R -->|TIDAK| T[[Cetak Laporan Bulanan]]
        S --> T
    end
    
    subgraph PIMPINAN["═══ KEPALA DINAS (Pimpinan) ═══"]
        U[[Terima Laporan Digital]] --> V[Review & Tanda Tangan]
        V --> W([Selesai])
    end
    
    G --> H
    J -.->|Kembali Input| E
    M --> P
    T --> U
```

---

## Versi Swimlane Sederhana

```mermaid
flowchart TB
    subgraph P["PETUGAS"]
        A([Mulai]) --> B[Login Mobile]
        B --> C[Survei Pasar]
        C --> D[Input Harga + Foto]
        D --> E[/Kirim Data/]
    end
    
    subgraph S["SISTEM"]
        F[(Database)] --> G[Validasi Otomatis]
        G --> H[Hitung Rata-rata]
        H --> I[Update Dashboard]
    end
    
    subgraph AD["ADMIN"]
        J[Login Web] --> K[Monitor Dashboard]
        K --> L[Analisis Data]
        L --> M[/Export Laporan/]
    end
    
    subgraph KD["PIMPINAN"]
        N[[Terima Laporan]] --> O([Selesai])
    end
    
    E --> F
    I --> K
    M --> N
```

---

## Perbandingan Sistem Berjalan vs Sistem Usulan

| Aspek | Sistem Berjalan (Manual) | Sistem Usulan (HARPA BANUA) |
|-------|--------------------------|----------------------------|
| Input Data | Google Form/Bitly | Aplikasi Mobile Khusus |
| Validasi | Manual oleh Admin | Otomatis oleh Sistem |
| Bukti Survei | Tidak Ada | Foto + GPS Otomatis |
| Rekap Data | Copy-paste ke Excel | Otomatis tersimpan di Database |
| Hitung Rata-rata | Manual dengan kalkulator | Otomatis oleh Sistem |
| Laporan | Ketik manual di Word | Generate Excel/PDF otomatis |
| Monitoring | Tidak real-time | Dashboard Real-time |
| Backup Data | File lokal (risiko hilang) | Cloud Database (aman) |

---

## Deskripsi Alur Sistem Usulan

### Kolom 1: PETUGAS LAPANGAN (Mobile App)
1. **Mulai** - Memulai tugas survei
2. **Login Aplikasi** - Masuk dengan akun yang terdaftar
3. **Survei ke Pasar** - Pergi ke pasar tradisional
4. **Input Harga via Mobile** - Input langsung di aplikasi
5. **Foto & GPS Otomatis** - Sistem mencatat bukti lokasi
6. **Kirim Data** - Data terkirim ke server secara real-time

### Kolom 2: SISTEM (Otomatis)
1. **Database MongoDB** - Data tersimpan di cloud
2. **Validasi Otomatis** - Sistem cek kelengkapan data
3. **Hitung Rata-rata** - Otomatis tanpa intervensi manual
4. **Update Dashboard** - Data langsung tampil di dashboard

### Kolom 3: ADMIN DKP3 (Web Admin)
1. **Login Web Admin** - Masuk ke panel admin
2. **Monitor Dashboard** - Lihat data real-time
3. **Filter & Analisis** - Analisis berdasarkan pasar/komoditas
4. **Export Laporan** - Generate Excel/PDF dengan 1 klik

### Kolom 4: KEPALA DINAS
1. **Terima Laporan Digital** - Laporan siap pakai
2. **Selesai** - Proses efisien

---

## Keunggulan Sistem Usulan

1. **Efisiensi Waktu** - Tidak perlu rekap manual
2. **Akurasi Data** - Validasi otomatis, minim human error  
3. **Real-time** - Data langsung tersedia
4. **Bukti Digital** - Foto & GPS sebagai validasi
5. **Backup Otomatis** - Data aman di cloud
6. **Paperless** - Mengurangi penggunaan kertas

---

## Cara Menggunakan di Draw.io:

1. Buka **Draw.io** (app.diagrams.net)
2. Klik menu **Arrange → Insert → Advanced → Mermaid...**
3. Copy kode di atas (tanpa tanda ```)
4. Paste dan klik **Insert**
