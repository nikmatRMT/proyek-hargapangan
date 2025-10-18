# proyek-hargapangan

Backend PHP (baru) untuk menggantikan server Node, dengan frontend tetap.

Menjalankan backend PHP:

- Persyaratan: PHP 8+, Composer
- Install dependensi: `cd php-backend && composer install`
- Jalankan server dev: `php -S localhost:4000 -t php-backend/public`
  - Untuk memakai MongoDB, set env: `MONGODB_URI` dan `MONGODB_DB` (default: `harga_pasar_mongo`).
  - Backend otomatis pakai Mongo jika tersedia; jika tidak, fallback ke Excel `server/data/`.

Endpoint utama yang disediakan:

- `GET /health` — status + jumlah baris
- `GET /api/markets` — daftar pasar
- `GET /api/commodities` — daftar komoditas
- `GET /api/prices` — data harga dengan filter `from`, `to`, `year`, `month`, `market|marketId`, `sort`, `page`, `pageSize`
- `PATCH /api/prices/:id` — ubah harga per ID
- `POST /api/prices/upsert` — upsert berdasarkan `{date, market_id, commodity_id}`
- `POST /api/import-excel/upload` — unggah dan impor Excel (field: `file`, `marketName`, `marketId`, `bulk` (0/1), opsional `month`, `year`, query `?truncate=1` untuk bersihkan sebelum impor)
- `GET /sse/prices` — SSE sederhana untuk auto-refresh (berbasis polling file)

Kompatibilitas tambahan (untuk referensi/legacy):

- `GET /reports`, `GET /reports/range`, `POST /reports`
- `GET /_debug/scan`, `GET /_debug/markets`, `GET /_debug/first?limit=20`

Sumber data:

- Secara default backend membaca file Excel dari `server/data` (misal `pasar-*-2024.xlsx`).
- Anda dapat mengatur env `EXCEL_FILES` (dipisah baris atau koma) untuk menentukan daftar file spesifik.
- Jika `MONGODB_URI` tersedia, data diambil/ditulis ke MongoDB pada koleksi: `pasar`, `komoditas`, `laporan_harga`.

Catatan SSE:

- Implementasi SSE di PHP menggunakan polling file `php-backend/storage/last_event.json` sehingga cukup untuk auto-refresh di dashboard, tanpa dependency eksternal.

Catatan deploy (Vercel)

- Jika Anda men-deploy ke Vercel dan melihat peringatan "Provided `memory` setting in `vercel.json` is ignored on Active CPU billing", itu berarti pengaturan `memory` dikelola oleh billing Active CPU di dashboard Vercel dan tidak diperlukan di `vercel.json`. Repositori ini tidak menyertakan entri `memory` di `vercel.json`, jadi peringatan biasanya berasal dari konfigurasi dashboard lama atau pengaturan pengguna. Anda bisa mengabaikannya atau menghapus entri `memory` jika Anda mengelola konfigurasi deployment melalui file lain.

Debug MongoDB on Vercel

If you want to verify whether the PHP `mongodb` extension is available and whether the app can connect to your MongoDB Atlas URI, deploy and visit these debug endpoints (remove them after verification):

- `/api/phpinfo.php` — prints loaded PHP extensions and phpinfo.
- `/api/check-mongo.php` — attempts to use `MongoBridge::isAvailable()` and reports whether the extension and connection check passed.

Remember to add `MONGODB_URI` (and optionally `MONGODB_DB`) in Vercel Environment Variables before testing. Remove these debug endpoints after you're done to avoid exposing environment details.


Pembersihan util JS (Mongo)

- Skrip sementara untuk import/cek Mongo sudah dibersihkan. Gunakan backend PHP untuk operasi rutin.
