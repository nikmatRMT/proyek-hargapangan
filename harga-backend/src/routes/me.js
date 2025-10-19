// src/routes/me.js
import { Router } from 'express';
import { collections } from '../tools/db.js';

const router = Router();

// GET /api/me  → detail profil terkini dari DB (berdasarkan session)
router.get('/', async (req, res) => {
  const s = req.session?.user;
  if (!s?.id) return res.status(401).json({ message: 'Unauthorized' });

  const { users } = collections();
  const u = await users.findOne({ id: s.id }, { projection: { _id: 0 } });
  if (!u) return res.status(401).json({ message: 'Sesi tidak valid' });
  return res.json({ user: u });
});

// PATCH /api/me  → update profil dasar (nama, telepon, alamat, foto)
router.patch('/', async (req, res) => {
  const s = req.session?.user;
  if (!s?.id) return res.status(401).json({ message: 'Unauthorized' });

  const allow = ['nama_lengkap', 'phone', 'alamat', 'foto'];
  const patch = {};
  for (const k of allow) if (k in req.body) patch[k] = req.body[k];

  if (!Object.keys(patch).length) {
    const { users } = collections();
    const u = await users.findOne({ id: s.id }, { projection: { _id: 0 } });
    return res.json({ user: u });
  }

  const { users } = collections();
  await users.updateOne({ id: s.id }, { $set: { ...patch, updated_at: new Date() } });
  const u = await users.findOne({ id: s.id }, { projection: { _id: 0 } });
  return res.json({ user: u });
});

export default router;
