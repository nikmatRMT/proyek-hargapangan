// src/routes/mobileReports.js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import requireMobileAuth from '../middleware/requireMobileAuth.js';
import { pool } from '../tools/db.js';
import { bus } from '../events/bus.js';

const router = Router();

// === File upload (optional foto bukti) ===
// Gunakan os.tmpdir() pada Vercel agar writable
const isVercel = process.env.VERCEL === '1';
const uploadRoot = isVercel
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'tmp', 'uploads');
const uploadDir = uploadRoot; // simpan langsung di folder uploads
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (_) {}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Helpers lookup ke tabel sesuai skema
async function getMarketIdByName(namaPasar) {
  const [rows] = await pool.query(
    'SELECT id FROM pasar WHERE nama_pasar = ? LIMIT 1',
    [namaPasar]
  );
  return rows?.[0]?.id || null;
}

async function getCommodityByName(namaKomoditas) {
  const [rows] = await pool.query(
    'SELECT id, unit FROM komoditas WHERE nama_komoditas = ? LIMIT 1',
    [namaKomoditas]
  );
  return rows?.[0] || null;
}

/**
 * POST /m/reports
 * Body (JSON atau multipart/form-data):
 *  - date (YYYY-MM-DD; default: today)
 *  - market_name (harus sama dengan kolom pasar.nama_pasar)
 *  - commodity_name (harus sama dengan kolom komoditas.nama_komoditas)
 *  - price (number, rupiah tanpa separator)
 *  - notes (opsional)
 *  - gps_lat, gps_lng (opsional)
 *  - photo (opsional, multipart)
 */
router.post('/', requireMobileAuth, upload.single('photo'), async (req, res) => {
  try {
    const b = req.body || {};
    const tanggal = (b.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const marketName = (b.market_name || '').trim();
    const commodityName = (b.commodity_name || '').trim();
    const price = Number(b.price);
    const notes = b.notes ? String(b.notes) : null;
    const lat = b.gps_lat != null && b.gps_lat !== '' ? Number(b.gps_lat) : null;
    const lng = b.gps_lng != null && b.gps_lng !== '' ? Number(b.gps_lng) : null;

    if (!marketName || !commodityName || !price) {
      return res.status(400).json({
        message: 'market_name, commodity_name, dan price wajib diisi',
      });
    }

    const marketId = await getMarketIdByName(marketName);
    if (!marketId) {
      return res.status(404).json({ message: `Pasar "${marketName}" tidak ditemukan` });
    }

    const komoditas = await getCommodityByName(commodityName);
    if (!komoditas) {
      return res.status(404).json({ message: `Komoditas "${commodityName}" tidak ditemukan` });
    }

    let fotoUrl = null;
    if (req.file) {
      fotoUrl = `/uploads/${req.file.filename}`;
    }

    const gpsUrl = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null;

    await pool.query(
      `INSERT INTO laporan_harga
        (market_id, komoditas_id, user_id, tanggal_lapor, harga, keterangan,
         foto_url, gps_url, latitude, longitude, status)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'verified')
       ON DUPLICATE KEY UPDATE
         harga = VALUES(harga),
         keterangan = VALUES(keterangan),
         foto_url = VALUES(foto_url),
         gps_url = VALUES(gps_url),
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         updated_at = NOW()`,
      [
        marketId,
        komoditas.id,
        req.mobileUser?.id ?? null,
        tanggal,
        price,
        notes,
        fotoUrl,
        gpsUrl,
        lat,
        lng,
      ]
    );

    // 🔔 broadcast ke klien (dashboard)
    bus.emit('prices:changed', {
      reason: 'mobile-report',
      marketId,
      date: tanggal,
      commodityId: komoditas.id,
      at: Date.now(),
    });

    return res.json({
      ok: true,
      market_id: marketId,
      komoditas_id: komoditas.id,
      tanggal,
    });
  } catch (err) {
    console.error('POST /m/reports error:', err);
    return res.status(500).json({
      message: err?.message || 'Gagal menyimpan laporan',
    });
  }
});

export default router;
