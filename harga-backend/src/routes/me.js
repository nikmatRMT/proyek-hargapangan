// src/routes/me.js
import { Router } from 'express';
import { pool } from '../tools/db.js';

const router = Router();

// GET /api/me  → detail profil terkini dari DB (berdasarkan session)
router.get('/', async (req, res) => {
  const s = req.session?.user;
  if (!s?.id) return res.status(401).json({ message: 'Unauthorized' });

  const [[u]] = await pool.query(
    `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
     FROM users WHERE id=? LIMIT 1`,
    [s.id]
  );
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
    const [[u]] = await pool.query(
      `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
       FROM users WHERE id=?`,
      [s.id]
    );
    return res.json({ user: u });
  }

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
});

export default router;
