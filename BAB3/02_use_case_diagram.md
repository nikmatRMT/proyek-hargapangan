# 2. Use Case Diagram

---

## 2.1 Use Case Diagram Utama

```mermaid
flowchart LR
    subgraph Aktor
        A1((Admin))
        A2((Petugas))
    end
    
    subgraph UC_AUTH["🔐 Autentikasi"]
        UC1[Login]
        UC2[Logout]
        UC3[Ubah Password]
    end
    
    subgraph UC_MASTER["📦 Master Data"]
        UC4[Kelola Pasar]
        UC5[Kelola Komoditas]
        UC6[Kelola Pengguna]
    end
    
    subgraph UC_TRANSAKSI["💰 Transaksi"]
        UC7[Input Harga]
        UC8[Edit Harga]
        UC9[Hapus Harga]
        UC10[Lihat Dashboard]
    end
    
    subgraph UC_LAPORAN["📊 Laporan"]
        UC11[Export Excel]
        UC12[Export PDF]
        UC13[Lihat Riwayat Survey]
    end
    
    A1 --> UC1
    A1 --> UC2
    A1 --> UC3
    A1 --> UC4
    A1 --> UC5
    A1 --> UC6
    A1 --> UC7
    A1 --> UC8
    A1 --> UC9
    A1 --> UC10
    A1 --> UC11
    A1 --> UC12
    A1 --> UC13
    
    A2 --> UC1
    A2 --> UC2
    A2 --> UC3
    A2 --> UC7
    A2 --> UC13
```

---

## 2.2 Deskripsi Use Case

| ID | Use Case | Aktor | Deskripsi |
|----|----------|-------|-----------|
| UC1 | Login | Admin, Petugas | Masuk ke sistem dengan username & password |
| UC2 | Logout | Admin, Petugas | Keluar dari sistem |
| UC3 | Ubah Password | Admin, Petugas | Mengubah password akun sendiri |
| UC4 | Kelola Pasar | Admin | CRUD data pasar |
| UC5 | Kelola Komoditas | Admin | CRUD data komoditas |
| UC6 | Kelola Pengguna | Admin | CRUD data user, reset password |
| UC7 | Input Harga | Admin, Petugas | Memasukkan harga komoditas |
| UC8 | Edit Harga | Admin | Mengubah data harga yang sudah ada |
| UC9 | Hapus Harga | Admin | Menghapus data harga (bulk/single) |
| UC10 | Lihat Dashboard | Admin | Melihat ringkasan dan grafik |
| UC11 | Export Excel | Admin | Mengunduh laporan format Excel |
| UC12 | Export PDF | Admin | Mengunduh laporan format PDF |
| UC13 | Lihat Riwayat | Admin, Petugas | Melihat riwayat survey petugas |
