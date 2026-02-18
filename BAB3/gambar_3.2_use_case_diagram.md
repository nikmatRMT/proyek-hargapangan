# Gambar 3.2 Use Case Diagram Sistem Usulan

## Diagram Mermaid (Copy ke Draw.io → Advanced → Mermaid)

```mermaid
flowchart LR
    subgraph SISTEM["SISTEM HARPA BANUA"]
        subgraph AUTH["Autentikasi"]
            UC1([Login])
            UC2([Logout])
            UC3([Ubah Password])
        end
        
        subgraph MASTER["Master Data"]
            UC4([Kelola Pasar])
            UC5([Kelola Komoditas])
            UC6([Kelola Pengguna])
        end
        
        subgraph TRANSAKSI["Transaksi Harga"]
            UC7([Input Harga])
            UC8([Edit Harga])
            UC9([Hapus Harga])
            UC10([Upload Foto Bukti])
        end
        
        subgraph DASHBOARD["Monitoring"]
            UC11([Lihat Dashboard])
            UC12([Filter Data])
            UC13([Lihat Grafik Tren])
        end
        
        subgraph LAPORAN["Laporan"]
            UC14([Export Excel])
            UC15([Export PDF])
            UC16([Lihat Riwayat Survey])
        end
    end
    
    ADMIN((Admin))
    PETUGAS((Petugas))
    
    ADMIN --- UC1
    ADMIN --- UC2
    ADMIN --- UC3
    ADMIN --- UC4
    ADMIN --- UC5
    ADMIN --- UC6
    ADMIN --- UC7
    ADMIN --- UC8
    ADMIN --- UC9
    ADMIN --- UC10
    ADMIN --- UC11
    ADMIN --- UC12
    ADMIN --- UC13
    ADMIN --- UC14
    ADMIN --- UC15
    ADMIN --- UC16
    
    PETUGAS --- UC1
    PETUGAS --- UC2
    PETUGAS --- UC3
    PETUGAS --- UC7
    PETUGAS --- UC10
    PETUGAS --- UC16
```

---

## Versi Alternatif (Lebih Sederhana untuk Draw.io)

```mermaid
flowchart TB
    ADMIN((Admin))
    PETUGAS((Petugas))
    
    UC1([Login])
    UC2([Logout])
    UC3([Kelola Pasar])
    UC4([Kelola Komoditas])
    UC5([Kelola Pengguna])
    UC6([Input Harga])
    UC7([Edit Harga])
    UC8([Hapus Harga])
    UC9([Upload Foto])
    UC10([Lihat Dashboard])
    UC11([Export Excel])
    UC12([Export PDF])
    UC13([Riwayat Survey])
    
    ADMIN --- UC1
    ADMIN --- UC2
    ADMIN --- UC3
    ADMIN --- UC4
    ADMIN --- UC5
    ADMIN --- UC6
    ADMIN --- UC7
    ADMIN --- UC8
    ADMIN --- UC9
    ADMIN --- UC10
    ADMIN --- UC11
    ADMIN --- UC12
    ADMIN --- UC13
    
    PETUGAS --- UC1
    PETUGAS --- UC2
    PETUGAS --- UC6
    PETUGAS --- UC9
    PETUGAS --- UC13
```

---

## Deskripsi Use Case

| ID | Use Case | Aktor | Deskripsi |
|----|----------|-------|-----------|
| UC1 | Login | Admin, Petugas | Masuk ke sistem dengan username & password |
| UC2 | Logout | Admin, Petugas | Keluar dari sistem |
| UC3 | Kelola Pasar | Admin | Tambah, ubah, hapus data pasar |
| UC4 | Kelola Komoditas | Admin | Tambah, ubah, hapus data komoditas |
| UC5 | Kelola Pengguna | Admin | Tambah, ubah, hapus, reset password user |
| UC6 | Input Harga | Admin, Petugas | Memasukkan harga komoditas |
| UC7 | Edit Harga | Admin | Mengubah data harga yang sudah ada |
| UC8 | Hapus Harga | Admin | Menghapus data harga (bulk/single) |
| UC9 | Upload Foto | Admin, Petugas | Mengunggah foto bukti survei |
| UC10 | Lihat Dashboard | Admin | Melihat ringkasan statistik dan grafik |
| UC11 | Export Excel | Admin | Mengunduh laporan format Excel |
| UC12 | Export PDF | Admin | Mengunduh laporan format PDF |
| UC13 | Riwayat Survey | Admin, Petugas | Melihat riwayat survey petugas |

---

## Hak Akses Per Aktor

| Use Case | Admin | Petugas |
|----------|:-----:|:-------:|
| Login | ✅ | ✅ |
| Logout | ✅ | ✅ |
| Kelola Pasar | ✅ | ❌ |
| Kelola Komoditas | ✅ | ❌ |
| Kelola Pengguna | ✅ | ❌ |
| Input Harga | ✅ | ✅ |
| Edit Harga | ✅ | ❌ |
| Hapus Harga | ✅ | ❌ |
| Upload Foto | ✅ | ✅ |
| Lihat Dashboard | ✅ | ❌ |
| Export Excel | ✅ | ❌ |
| Export PDF | ✅ | ❌ |
| Riwayat Survey | ✅ | ✅ |

---

## Cara Menggunakan di Draw.io

1. Buka **Draw.io** (app.diagrams.net)
2. Klik **Arrange → Insert → Advanced → Mermaid...**
3. Copy kode di atas (tanpa tanda ```)
4. Paste dan klik **Insert**

### Tips untuk Use Case di Draw.io Manual:
1. Gunakan shape **Ellipse** untuk Use Case
2. Gunakan shape **Actor** (stick figure) untuk Aktor
3. Gambar **rectangle** besar dengan judul "SISTEM HARPA BANUA"
4. Hubungkan aktor ke use case dengan **garis tanpa panah**
