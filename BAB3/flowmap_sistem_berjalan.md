# Flowmap Sistem Berjalan - Pelaporan Harga Pangan (Manual)

## Diagram Mermaid (Copy ke Draw.io → Advanced → Mermaid)

```mermaid
flowchart TB
    subgraph ENUMERATOR["ENUMERATOR (Petugas Lapangan)"]
        A([Mulai]) --> B[Survei ke Pasar Tradisional]
        B --> C[Mengumpulkan 3 Sampel Harga dari Pedagang Berbeda]
        C --> D[/Mencatat Harga ke Google Form/Bitly/]
        D --> E[Kirim Laporan]
    end
    
    subgraph ADMIN["ADMIN DKP3"]
        F[/Menerima Data Laporan/] --> G{Apakah Ada 3 Sampel?}
        G -->|TIDAK| H[Minta Petugas Lengkapi]
        G -->|YA| I[/Rekapitulasi ke Excel - MANUAL/]
        I --> J[Menghitung Rata-rata Manual]
        J --> K[[Cetak Laporan Bulanan]]
    end
    
    subgraph PIMPINAN["KEPALA DINAS (Pimpinan)"]
        L[[Terima Laporan Bulanan]] --> M([Selesai])
    end
    
    E --> F
    H --> N((A))
    N --> C
    K --> L
```

---

## Versi Alternatif (Lebih Detail)

```mermaid
flowchart TB
    subgraph E["ENUMERATOR"]
        A([Mulai]) --> B[Survei ke Pasar]
        B --> C[Kumpulkan 3 Sampel Harga]
        C --> D[/Input ke Google Form/]
        D --> E1[Kirim Laporan]
    end
    
    subgraph AD["ADMIN DKP3"]
        F[/Terima Data/] --> G{Ada 3 Sampel?}
        G -->|Tidak| H[Hubungi Petugas]
        H -.-> C
        G -->|Ya| I[/Rekap ke Excel/]
        I --> J[Hitung Rata-rata]
        J --> K[[Cetak Laporan]]
    end
    
    subgraph KD["KEPALA DINAS"]
        L[[Terima Laporan]] --> M([Selesai])
    end
    
    E1 --> F
    K --> L
```

---

## Deskripsi Alur Sistem Berjalan

### Kolom 1: ENUMERATOR (Petugas Lapangan)
1. **Mulai** - Memulai tugas survei harian
2. **Survei ke Pasar** - Pergi ke pasar tradisional
3. **Mengumpulkan 3 Sampel Harga** - Mencatat harga dari 3 pedagang berbeda untuk setiap komoditas
4. **Mencatat ke Google Form** - Input data secara manual via form online
5. **Kirim Laporan** - Mengirim data ke Admin

### Kolom 2: ADMIN DKP3
1. **Menerima Data** - Menerima laporan dari petugas
2. **Cek Validasi: Ada 3 Sampel?**
   - **TIDAK** → Minta petugas lengkapi data
   - **YA** → Lanjut proses
3. **Rekapitulasi ke Excel** - Pindahkan data ke spreadsheet (MANUAL)
4. **Menghitung Rata-rata** - Hitung rata-rata 3 sampel secara manual
5. **Cetak Laporan Bulanan** - Generate laporan untuk pimpinan

### Kolom 3: KEPALA DINAS
1. **Terima Laporan** - Menerima laporan bulanan
2. **Selesai** - Proses selesai

---

## Cara Menggunakan di Draw.io:

1. Buka **Draw.io** (app.diagrams.net)
2. Klik menu **Arrange → Insert → Advanced → Mermaid...**
3. Copy kode di atas (tanpa tanda ```)
4. Paste dan klik **Insert**

---

## Legenda Simbol:

| Simbol | Kode | Keterangan |
|--------|------|------------|
| Oval | `([text])` | Terminal (Mulai/Selesai) |
| Kotak | `[text]` | Proses |
| Parallelogram | `[/text/]` | Input/Output Manual |
| Belah Ketupat | `{text}` | Decision (Keputusan) |
| Kotak Garis Ganda | `[[text]]` | Dokumen |
| Lingkaran | `((text))` | Konektor |
| Garis Solid | `-->` | Alur Normal |
| Garis Putus | `-.->` | Alur Balik |
