# Deskripsi Tampilan Implementasi Antarmuka (Bab 3.5)

Berikut adalah daftar deskripsi untuk setiap screenshot hasil implementasi, disesuaikan dengan struktur Bab 3.5 (Perancangan/Implementasi Antarmuka). Anda dapat menyesuaikan nomor gambar ("Gambar 3.x") sesuai urutan terakhir di laporan Anda.

## 1. Halaman Login
**Nama File:** `01_admin_login.png`
**Judul Gambar:** Gambar 3.8 Tampilan Halaman Login
**Deskripsi:**
Halaman Login merupakan pintu masuk utama aplikasi HARPA BANUA. Pada halaman ini, pengguna (Admin atau Petugas) diwajibkan memasukkan *username* dan *password* yang valid. Sistem akan memvalidasi kredensial tersebut untuk menentukan hak akses pengguna, apakah akan diarahkan ke Dashboard Admin atau Halaman Input Petugas.

## 2. Dashboard Admin
**Nama File:** `02_admin_dashboard_ringkasan.png`
**Judul Gambar:** Gambar 3.9 Tampilan Halaman Dashboard (Ringkasan)
**Deskripsi:**
Halaman Dashboard menyajikan ringkasan statistik terkini mengenai harga pangan di Kota Banjarbaru. Terdapat kartu informasi ("Total Survey Hari Ini", "Harga Tertinggi", "Jumlah Pasar") serta grafik tren visual yang memudahkan Admin memantau fluktuasi harga secara *real-time*.

**Nama File:** `03_admin_dashboard_data_tabel.png`
**Judul Gambar:** Gambar 3.10 Tampilan Halaman Dashboard (Data Tabel)
**Deskripsi:**
Bagian bawah Dashboard menampilkan Data Tabel Harga Terkini. Tabel ini memuat daftar komoditas, pasar, tanggal, dan harga terbaru, lengkap dengan indikator status harga (Naik/Turun/Stabil) yang diberi kode warna untuk memudahkan pembacaan cepat.

## 3. Kelola Data Master
Menu ini digunakan Admin untuk mengelola data referensi sistem.

### a. Kelola Pasar
**Nama File:** `04_admin_kelola_pasar.png`
**Judul Gambar:** Gambar 3.11 Tampilan Halaman Kelola Data Pasar
**Deskripsi:**
Halaman ini menampilkan daftar seluruh pasar yang terdaftar dalam sistem. Admin dapat melihat informasi nama pasar dan alamat, serta memiliki opsi untuk mengubah atau menghapus data pasar.

**Nama File:** `04b_admin_kelola_pasar_modal.png`
**Judul Gambar:** Gambar 3.12 Tampilan Modal Tambah Pasar
**Deskripsi:**
Formulir *pop-up* (modal) yang muncul ketika Admin menekan tombol "Tambah Pasar". Admin dapat memasukkan nama pasar baru dan alamatnya tanpa perlu berpindah halaman.

### b. Kelola Petugas
**Nama File:** `05_admin_kelola_petugas.png`
**Judul Gambar:** Gambar 3.13 Tampilan Halaman Kelola Data Petugas
**Deskripsi:**
Halaman ini digunakan untuk manajemen akun pengguna aplikasi. Admin dapat melihat daftar petugas survei, NIP, *username*, dan status aktif akun mereka.

**Nama File:** `05b_admin_kelola_petugas_modal.png`
**Judul Gambar:** Gambar 3.14 Tampilan Modal Tambah Petugas
**Deskripsi:**
Interface untuk mendaftarkan petugas baru. Admin melengkapi data seperti Nama Lengkap, NIP, Username, Password, dan memilih Peran (Admin/Petugas) serta Pasar yang ditugaskan (jika ada).

### c. Kelola Komoditas
**Nama File:** `12_admin_kelola_komoditas.png`
**Judul Gambar:** Gambar 3.15 Tampilan Halaman Kelola Data Komoditas
**Deskripsi:**
Halaman ini memuat daftar komoditas pangan yang dipantau harganya. Admin dapat menambah jenis komoditas baru ataupun mengedit nama komoditas yang sudah ada.

**Nama File:** `12b_admin_kelola_komoditas_modal.png`
**Judul Gambar:** Gambar 3.16 Tampilan Modal Tambah Komoditas
**Deskripsi:**
Formulir sederhana untuk menambahkan item komoditas baru ke dalam database sistem.

## 4. Input Data Harga (Petugas & Admin)
**Nama File:** `08_petugas_input_data.png` (Tampilan Petugas) / `07_admin_input_data.png` (Tampilan Admin)
**Judul Gambar:** Gambar 3.17 Tampilan Halaman Input Data Harga
**Deskripsi:**
Halaman ini digunakan untuk memasukkan data survei harga harian. Pengguna memilih tanggal, pasar, dan komoditas, lalu memasukkan harga terbaru serta catatan jika diperlukan. Sistem secara otomatis mencatat waktu input.

## 5. Profil Petugas
**Nama File:** `09_petugas_profil.png`
**Judul Gambar:** Gambar 3.18 Tampilan Halaman Profil Pengguna
**Deskripsi:**
Halaman ini menampilkan informasi akun pengguna yang sedang login, termasuk foto profil, nama, NIP, dan jabatan. Pengguna juga dapat mengubah password atau foto profil mereka dari halaman ini.

## 6. Output Manager (Laporan & Ekspor)
**Nama File:** `06_admin_output_manager.png`
**Judul Gambar:** Gambar 3.19 Tampilan Halaman Output Manager
**Deskripsi:**
Pusat kendali pelaporan sistem. Admin dapat memfilter laporan berdasarkan Rentang Tanggal, Pasar, dan Komoditas. Tersedia berbagai tombol aksi untuk mengekspor laporan dalam format PDF atau Excel.

### Contoh Hasil Keluaran (Output)
Berikut adalah contoh dokumen yang dihasilkan oleh sistem (dapat dilampirkan sebagai bukti luaran sistem):

**a. Laporan Umum**
**Nama File:** `10_laporan_umum.png`
**Judul Gambar:** Gambar 3.20 Contoh Output PDF Laporan Harga Harian
**Deskripsi:**
Dokumen PDF resmi yang berisi rekapitulasi harga komoditas per hari dalam satu bulan. Laporan ini memiliki kop surat dinas, tabel data terstruktur, dan kolom tanda tangan pejabat berwenang.

**b. Laporan Spesifik**
**Nama File:** `11_laporan_spesifik.png`
**Judul Gambar:** Gambar 3.21 Contoh Output PDF Laporan Per Komoditas
**Deskripsi:**
Laporan yang difokuskan pada satu jenis komoditas (misal: Beras) untuk memantau fluktuasi harganya secara detail di pasar tertentu selama periode waktu yang dipilih.

**c. Laporan Aktivitas**
**Nama File:** `16_riwayat_petugas.png`
**Judul Gambar:** Gambar 3.22 Contoh Output PDF Riwayat Input Petugas
**Deskripsi:**
Laporan monitoring kinerja petugas yang menampilkan log aktivitas input data harga yang telah dilakukan oleh petugas survei.

**d. Daftar Data Master (Referensi)**
*File:* `13_daftar_pasar.png` (Daftar Pasar), `14_daftar_komoditas.png` (Daftar Komoditas), `15_daftar_petugas.png` (Daftar Akun)
**Judul Gambar:** Gambar 3.23 Contoh Output Daftar Referensi System
**Deskripsi:**
Dokumen cetak yang berisi daftar lengkap data master yang tersimpan dalam sistem, digunakan untuk keperluan inventarisasi data administratif.

---
*Catatan: Nomor gambar di atas (3.8 s/d 3.23) hanyalah contoh. Silakan sesuaikan urutannya dengan nomor terakhir di laporan Bab 3 Anda sebelumnya.*
