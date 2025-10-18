// src/routes/me.js
import { Router } from 'express';
import { pool } from '../tools/db.js';
import { isMongo } from '../tools/mongo.js';
import User from '../models/User.js';

const router = Router();

// GET /api/me  → detail profil terkini dari DB (berdasarkan session)
router.get('/', async (req, res) => {
  const s = req.session?.user;
  if (!s?.id) return res.status(401).json({ message: 'Unauthorized' });
  if (isMongo()) {
    const u = await User.findById(s.id).lean();
    if (!u) return res.status(401).json({ message: 'Sesi tidak valid' });
    return res.json({ user: {
      id: String(u._id), nip: u.nip ?? null, nama_lengkap: u.nama_lengkap,
      username: u.username, role: u.role, is_active: u.is_active ? 1 : 0,
      phone: u.phone ?? null, alamat: u.alamat ?? null, foto: u.foto ?? null,
      created_at: u.created_at, updated_at: u.updated_at
    } });
  } else {
    const [[u]] = await pool.query(
      `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
       FROM users WHERE id=? LIMIT 1`,
      [s.id]
    );
    if (!u) return res.status(401).json({ message: 'Sesi tidak valid' });
    return res.json({ user: u });
  }
});

// PATCH /api/me  → update profil dasar (nama, telepon, alamat, foto)
router.patch('/', async (req, res) => {
  const s = req.session?.user;
  if (!s?.id) return res.status(401).json({ message: 'Unauthorized' });

  const allow = ['nama_lengkap', 'phone', 'alamat', 'foto'];
  const patch = {};
  for (const k of allow) if (k in req.body) patch[k] = req.body[k];

  if (!Object.keys(patch).length) {
    if (isMongo()) {
      const u = await User.findById(s.id).lean();
      return res.json({ user: u });
    } else {
      const [[u]] = await pool.query(
        `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
         FROM users WHERE id=?`,
        [s.id]
      );
      return res.json({ user: u });
    }
  }

  if (isMongo()) {
    await User.findByIdAndUpdate(s.id, { ...patch }, { new: false });
    const u = await User.findById(s.id).lean();
    return res.json({ user: u });
  } else {
    const sets = Object.keys(patch).map(k => `${k}=?`).join(', ');
    const args = Object.values(patch);
    args.push(s.id);
    await pool.query(`UPDATE users SET ${sets}, updated_at=NOW() WHERE id=?`, args);
    const [[u]] = await pool.query(
      `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
       FROM users WHERE id=?`,
      [s.id]
    );
    return res.json({ user: u });
  }
});

export default router;
