# Daftar Antarmuka Sistem HARPA BANUA
(Berdasarkan Struktur Proyek & Implementasi Bab 3)

Berikut adalah daftar lengkap antarmuka (interface) yang terdapat dalam aplikasi HARPA BANUA, dikategorikan berdasarkan fungsinya sebagai Masukan (Input) atau Keluaran (Output).

## A. Antarmuka Masukan Sistem (Input Interfaces)
Antarmuka ini berfungsi sebagai media bagi pengguna (Admin/Petugas) untuk memasukkan perintah atau data ke dalam sistem.

| No | Nama Antarmuka | Deskripsi Fungsi | Pengguna |
| :-- | :--- | :--- | :--- |
| 1 | **Halaman Login** | Form untuk memasukkan *username* dan *password* guna otentikasi akses sistem. | Admin, Petugas |
| 2 | **Form Input Data Harga** | Antarmuka utama untuk petugas lapangan memasukkan data harga harian (memilih pasar, komoditas, dan input nominal harga). | Admin, Petugas |
| 3 | **Modal Tambah Pasar** | Formulir *pop-up* untuk menambahkan data pasar baru (Nama Pasar, Alamat, Koordinat/Foto). | Admin |
| 4 | **Modal Tambah Petugas** | Formulir *pop-up* untuk mendaftarkan akun petugas baru (NIP, Nama, Username, Password, Role). | Admin |
| 5 | **Modal Tambah Komoditas** | Formulir *pop-up* untuk menambah jenis komoditas baru yang akan disurvei. | Admin |
| 6 | **Form Edit Profil** | Antarmuka untuk mengubah data diri pengguna, termasuk mengganti foto profil dan mengubah kata sandi. | Admin, Petugas |
| 7 | **Filter Output Manager** | Panel kontrol untuk memilih parameter laporan yang akan dicetak (Rentang Tanggal, Pilihan Pasar, Jenis Komoditas). | Admin |
| 8 | **Form Edit Data (Master)** | Formulir untuk memperbarui/mengoreksi data master (Pasar/Petugas/Komoditas) yang sudah ada. | Admin |

## B. Antarmuka Keluaran Sistem (Output Interfaces)
Antarmuka ini berfungsi untuk menyajikan informasi, laporan, atau hasil pemrosesan data kepada pengguna.

| No | Nama Antarmuka | Deskripsi Fungsi | Format Keluaran |
| :-- | :--- | :--- | :--- |
| 1 | **Dashboard Statistik** | Halaman utama yang menampilkan ringkasan data: Total Survei, Harga Tertinggi/Terendah, dan Grafik Tren Harga. | Visual (Grafik & Kartu) |
| 2 | **Tabel Data Harga Terkini**| Daftar harga pangan terbaru yang masuk hari ini, dilengkapi indikator naik/turun (warna). | Tabel Interaktif |
| 3 | **Daftar Data Master** | Tampilan data referensi sistem (Tabel Pasar, Tabel Petugas, Tabel Komoditas) dengan fitur pencarian. | Tabel Interaktif |
| 4 | **Laporan Umum (Harian)** | Laporan rekapitulasi harga pangan per hari dalam periode satu bulan. | File PDF & Excel |
| 5 | **Laporan Spesifik** | Laporan detail pergerakan harga untuk satu jenis komoditas tertentu di pasar tertentu. | File PDF & Excel |
| 6 | **Laporan Rata-rata** | Laporan yang menyajikan harga rata-rata pangan di seluruh pasar atau per pasar. | File Excel |
| 7 | **Daftar & Riwayat Petugas**| Laporan cetak data petugas dan log aktivitas survei yang telah dilakukan. | File PDF |
| 8 | **Backup Data Sistem** | Fitur untuk mengunduh arsip lengkap data harga untuk keperluan cadangan (*backup*). | File PDF/Database |
| 9 | **Notifikasi Sistem** | Pesan *pop-up* (Toast) yang muncul memberikan status keberhasilan aksi (misal: "Data Berhasil Disimpan"). | Visual (Pop-up) |

---
*Dokumen ini disusun berdasarkan file source code (`src/pages/*`) dan hasil tangkapan layar antarmuka sistem.*
