// src/routes/mobileReports.js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import requireMobileAuth from '../middleware/requireMobileAuth.js';
import { collections, getNextSeq } from '../tools/db.js';
import { bus } from '../events/bus.js';

const router = Router();

// === File upload (optional foto bukti) ===
const uploadDir = process.env.NODE_ENV === 'production'
  ? path.resolve('/tmp/uploads')
  : path.resolve('tmp/uploads');

// Try to create directory, but don't fail if it doesn't work (serverless)
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (err) {
  console.warn('Warning: Could not create upload directory:', err.message);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Attempt to create directory dynamically for each upload
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
      console.warn('Warning: mkdir failed in multer destination:', err.message);
    }
    cb(null, uploadDir);
  },
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
  const { pasar } = collections();
  const r = await pasar.findOne({ nama_pasar: namaPasar }, { projection: { id: 1 } });
  return r?.id || null;
}

async function getCommodityByName(namaKomoditas) {
  const { komoditas } = collections();
  return komoditas.findOne({ nama_komoditas: namaKomoditas }, { projection: { _id: 0, id: 1, unit: 1 } });
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

    const { laporan_harga } = collections();
    const newId = await getNextSeq('laporan_harga');
    await laporan_harga.updateOne(
      { market_id: marketId, komoditas_id: komoditas.id, tanggal_lapor: tanggal },
      {
        $set: {
          user_id: req.user?.id ?? null,
          harga: price,
          keterangan: notes,
          foto_url: fotoUrl,
          gps_url: gpsUrl,
          latitude: lat,
          longitude: lng,
          status: 'verified',
          updated_at: new Date(),
        },
        $setOnInsert: { id: newId, created_at: new Date() },
      },
      { upsert: true }
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
