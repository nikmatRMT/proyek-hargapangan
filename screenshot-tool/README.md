# Auto Screenshot Tool untuk HARPA BANUA

Tool sederhana untuk mengambil screenshot otomatis semua halaman web-admin.

## Instalasi

```bash
# Install dependencies
pip install -r requirements.txt
```

## Konfigurasi

Edit file `auto_screenshot.py` dan ubah:

```python
# Kredensial login
LOGIN_USERNAME = "admin"      # Ganti dengan username Anda
LOGIN_PASSWORD = "admin123"   # Ganti dengan password Anda

# URL aplikasi (default localhost:5173)
BASE_URL = "http://localhost:5173"
```

## Cara Pakai

1. Pastikan web-admin sudah berjalan (`npm run dev`)
2. Jalankan script:

```bash
python auto_screenshot.py
```

3. Screenshot akan tersimpan di folder `screenshots/`

## Daftar Halaman yang Di-screenshot

| No | Route | Nama File |
|----|-------|-----------|
| 1 | /login | 01_login.png |
| 2 | / | 02_dashboard.png |
| 3 | /markets | 03_kelola_pasar.png |
| 4 | /commodities | 04_kelola_komoditas.png |
| 5 | /users | 05_kelola_petugas.png |
| 6 | /profile | 06_profil.png |
| 7 | /riwayat-petugas | 07_riwayat_survey.png |
| 8 | /backup | 08_backup.png |
| 9 | /output-manager | 09_output_manager.png |
| 10 | /input-data | 10_input_data.png |

## Catatan

- Pastikan Chrome/Chromium terinstall
- ChromeDriver akan otomatis dihandle oleh selenium-manager (Selenium 4.6+)
