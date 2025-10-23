import express from "express";
import { collections, getNextSeq } from "../tools/db.js";
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { logAudit } from '../tools/db.js';

const router = express.Router();

/** GET /api/commodities → { rows: [...] } */
router.get("/", async (_req, res) => {
  const { komoditas } = collections();
  const rows = await komoditas.find({}, { projection: { _id: 0, id: 1, nama_komoditas: 1 } }).sort({ nama_komoditas: 1 }).toArray();
  res.json({ rows });
});

// POST /api/commodities  — tambah komoditas baru
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nama_komoditas, name } = req.body || {};
    const nm = String(nama_komoditas || name || '').trim();
    if (!nm) return res.status(400).json({ ok: false, error: 'nama_komoditas wajib' });

    const { komoditas } = collections();
    const id = await getNextSeq('komoditas');
    try {
      const now = new Date();
      const row = { id, nama_komoditas: nm, unit: '(Rp/Kg)', created_at: now, updated_at: now };
      const ins = await komoditas.insertOne(row);
      // Audit log: komoditas created
      try { await logAudit({ collectionName: 'komoditas', documentId: id, action: 'create', user: req.user || null, after: row }); } catch (e) {}
      return res.json({ ok: true, row });
    } catch (err) {
      if (err && (err.code === 11000 || String(err.message || '').includes('E11000'))) {
        return res.status(409).json({ ok: false, error: 'duplicate_commodity', message: 'Komoditas dengan nama tersebut sudah ada' });
      }
      throw err;
    }
  } catch (e) {
    console.error('[POST /api/commodities] error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

// PUT /api/commodities/:id  — update nama komoditas
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nama_komoditas, name } = req.body || {};
    const nm = String(nama_komoditas || name || '').trim();
    if (!nm) return res.status(400).json({ ok: false, error: 'nama_komoditas wajib' });

    const { komoditas } = collections();
    const esc = nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const conflict = await komoditas.findOne({ nama_komoditas: { $regex: `^${esc}$`, $options: 'i' }, id: { $ne: id } });
    if (conflict) return res.status(409).json({ ok: false, error: 'duplicate_commodity', message: 'Komoditas dengan nama tersebut sudah ada', conflictId: conflict.id });

  const before = await komoditas.findOne({ id });
  const now = new Date();
  const r = await komoditas.updateOne({ id }, { $set: { nama_komoditas: nm, updated_at: now } });
  const after = await komoditas.findOne({ id });
    try { await logAudit({ collectionName: 'komoditas', documentId: id, action: 'update', user: req.user || null, before, after }); } catch (e) {}
    return res.json({ ok: true, row: after });
  } catch (e) {
    console.error('[PUT /api/commodities/:id] error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

// DELETE /api/commodities/:id  — delete komoditas
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { komoditas, laporan_harga } = collections();
    const before = await komoditas.findOne({ id });
    if (!before) return res.status(404).json({ ok: false, error: 'not_found' });

    // Cek apakah ada laporan yang mereferensikan komoditas ini
    const esc = (before.nama_komoditas || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const refQuery = {
      $or: [
        { komoditas_id: id },
        { komoditas: { $regex: `^${esc}$`, $options: 'i' } },
      ],
    };
    const referencingCount = await laporan_harga.countDocuments(refQuery);
    if (referencingCount > 0) {
      return res.status(409).json({ ok: false, error: 'referenced', message: `Tidak bisa menghapus komoditas karena masih ada ${referencingCount} laporan yang menggunakan komoditas ini.`, referencingCount });
    }

    const r = await komoditas.deleteOne({ id });
    try { await logAudit({ collectionName: 'komoditas', documentId: id, action: 'delete', user: req.user || null, before }); } catch (e) {}
    return res.json({ ok: true, deleted: Number(r?.deletedCount ?? 0) });
  } catch (e) {
    console.error('[DELETE /api/commodities/:id] error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

export default router;
