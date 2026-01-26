// src/routes/mobileReports.js
import { Router } from 'express';
import multer from 'multer';
import requireMobileAuth from '../middleware/requireMobileAuth.js';
import { collections, getNextSeq } from '../tools/db.js';
import { bus } from '../events/bus.js';
import { uploadToBlob, deleteFromBlob } from '../lib/blob.js';

const router = Router();

// === File upload (optional foto bukti) ===
// Gunakan memoryStorage untuk Vercel Blob (tidak pakai disk)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    // Accept common image formats
    if (!/image\/(jpeg|jpg|png|webp|heic)/.test(file.mimetype)) {
      return cb(new Error('File harus berupa gambar (JPG/PNG/WebP)'));
    }
    cb(null, true);
  },
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
    console.log('[Mobile Report] User:', req.mobileUser);
    console.log('[Mobile Report] Body:', req.body);
    console.log('[Mobile Report] File:', req.file ? 'Yes' : 'No');
    
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

    // Upload foto bukti ke Vercel Blob (jika ada)
    let fotoUrl = null;
    if (req.file) {
      try {
        const ext = req.file.mimetype === 'image/png' ? '.png' : 
                    req.file.mimetype === 'image/webp' ? '.webp' : 
                    req.file.mimetype === 'image/heic' ? '.heic' : '.jpg';
        const filename = `bukti/${marketId}-${komoditas.id}-${tanggal}-${Date.now()}${ext}`;
        
        const blob = await uploadToBlob(req.file.buffer, filename, {
          contentType: req.file.mimetype,
        });
        fotoUrl = blob.url;
        console.log('[Mobile Report] Foto bukti uploaded to Blob:', fotoUrl);
      } catch (err) {
        console.error('[Mobile Report] Failed to upload foto to Blob:', err);
        // Continue without photo if upload fails (non-blocking)
      }
    }

    const gpsUrl = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null;

    const { laporan_harga } = collections();
    
    // CEK DUPLIKASI: Apakah sudah ada data untuk hari, pasar, dan komoditas yang sama?
    const existing = await laporan_harga.findOne(
      { market_id: marketId, komoditas_id: komoditas.id, tanggal_lapor: tanggal },
      { projection: { id: 1, foto_url: 1, harga: 1, keterangan: 1 } }
    );

    if (existing) {
      console.log('[Mobile Report] Data sudah ada - menolak duplikasi:', {
        market_id: marketId,
        komoditas_id: komoditas.id,
        tanggal_lapor: tanggal,
        existing_id: existing.id
      });
      
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: `Duplikasi! Data untuk "${commodityName}" di "${marketName}" tanggal ${tanggal} sudah ada.`,
        existing_data: {
          id: existing.id,
          harga: existing.harga,
          keterangan: existing.keterangan,
          foto_url: existing.foto_url
        }
      });
    }

    // Insert new data (no upsert since we already checked for duplicates)
    const newId = await getNextSeq('laporan_harga');
    await laporan_harga.insertOne({
      id: newId,
      market_id: marketId,
      komoditas_id: komoditas.id,
      tanggal_lapor: tanggal,
      user_id: req.mobileUser?.id ?? null,
      harga: price,
      keterangan: notes,
      foto_url: fotoUrl,
      gps_url: gpsUrl,
      latitude: lat,
      longitude: lng,
      status: 'verified',
      created_at: new Date(),
      updated_at: new Date(),
    });


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
      message: 'Laporan berhasil disimpan',
      market_id: marketId,
      komoditas_id: komoditas.id,
      tanggal,
      id: newId
    });
  } catch (err) {
    console.error('POST /m/reports error:', err);
    return res.status(500).json({
      message: err?.message || 'Gagal menyimpan laporan',
    });
  }
});

export default router;
