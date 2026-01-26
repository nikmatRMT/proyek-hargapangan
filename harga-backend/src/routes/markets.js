// PATCH: Tambahkan field alamat='' pada semua pasar lama yang belum punya field alamat
import { getDb, initMongo } from '../tools/db.js';

async function ensureAlamatFieldOnAllMarkets() {
  const db = getDb();
  const pasar = db.collection('pasar');
  await pasar.updateMany(
    { $or: [ { alamat: { $exists: false } }, { alamat: null } ] },
    { $set: { alamat: '' } }
  );
}

// Pastikan initMongo selesai sebelum patch dijalankan
(async () => {
  await initMongo();
  await ensureAlamatFieldOnAllMarkets().catch(console.error);
})();

import express from "express";
import { collections, getNextSeq } from "../tools/db.js";
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { logAudit } from '../tools/db.js';

const router = express.Router();

// Ensure MongoDB is initialized
await initMongo();

/** GET /api/markets → { rows: [...] } */
router.get("/", async (_req, res) => {
  const { pasar } = collections();
  const rows = await pasar.find({}, { projection: { _id: 0, id: 1, nama_pasar: 1, alamat: 1 } }).sort({ nama_pasar: 1 }).toArray();
  res.json({ rows });
});

// POST /api/markets  — tambah pasar baru
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nama_pasar, name, alamat } = req.body || {};
    const nm = String(nama_pasar || name || '').trim();
    const al = alamat !== undefined ? String(alamat).trim() : '';
    if (!nm) return res.status(400).json({ ok: false, error: 'nama_pasar wajib' });

    const { pasar } = collections();
    const id = await getNextSeq('pasar');
    try {
      const now = new Date();
      const row = { id, nama_pasar: nm, alamat: al, created_at: now, updated_at: now };
      const ins = await pasar.insertOne(row);
      // Audit log: pasar created
      try { await logAudit({ collectionName: 'pasar', documentId: id, action: 'create', user: req.user || null, after: row }); } catch (e) {}
      return res.json({ ok: true, row });
    } catch (err) {
      if (err && (err.code === 11000 || String(err.message || '').includes('E11000'))) {
        return res.status(409).json({ ok: false, error: 'duplicate_market', message: 'Pasar dengan nama tersebut sudah ada' });
      }
      throw err;
    }
  } catch (e) {
    console.error('[POST /api/markets] error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

// PUT /api/markets/:id  — update nama pasar
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nama_pasar, name, alamat } = req.body || {};
    const nm = String(nama_pasar || name || '').trim();
    const al = alamat !== undefined ? String(alamat).trim() : '';
    if (!nm) return res.status(400).json({ ok: false, error: 'nama_pasar wajib' });

    const { pasar } = collections();
    // cek duplikat nama (case-insensitive)
    const esc = nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const conflict = await pasar.findOne({ nama_pasar: { $regex: `^${esc}$`, $options: 'i' }, id: { $ne: id } });
    if (conflict) return res.status(409).json({ ok: false, error: 'duplicate_market', message: 'Pasar dengan nama tersebut sudah ada', conflictId: conflict.id });

    const before = await pasar.findOne({ id });
    const now = new Date();
    const r = await pasar.updateOne({ id }, { $set: { nama_pasar: nm, alamat: al, updated_at: now } });
    const after = await pasar.findOne({ id });
    try { await logAudit({ collectionName: 'pasar', documentId: id, action: 'update', user: req.user || null, before, after }); } catch (e) {}
    return res.json({ ok: true, row: after });
  } catch (e) {
    console.error('[PUT /api/markets/:id] error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

// DELETE /api/markets/:id  — delete pasar
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { pasar, laporan_harga } = collections();
    const before = await pasar.findOne({ id });
    if (!before) return res.status(404).json({ ok: false, error: 'not_found' });

    // Cek apakah ada laporan yang mereferensikan pasar ini
    const esc = (before.nama_pasar || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const refQuery = {
      $or: [
        { market_id: id },
        { market: { $regex: `^${esc}$`, $options: 'i' } },
        { pasar: { $regex: `^${esc}$`, $options: 'i' } },
      ],
    };
    const referencingCount = await laporan_harga.countDocuments(refQuery);
    if (referencingCount > 0) {
      return res.status(409).json({ ok: false, error: 'referenced', message: `Tidak bisa menghapus pasar karena masih ada ${referencingCount} laporan yang menggunakan pasar ini.`, referencingCount });
    }

    const r = await pasar.deleteOne({ id });
    try { await logAudit({ collectionName: 'pasar', documentId: id, action: 'delete', user: req.user || null, before }); } catch (e) {}
    return res.json({ ok: true, deleted: Number(r?.deletedCount ?? 0) });
  } catch (e) {
    console.error('[DELETE /api/markets/:id] error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

export default router;
