// src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../tools/db.js';
import { isMongo } from '../tools/mongo.js';
import User from '../models/User.js';

const router = Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) return res.status(400).json({ message: 'username & password wajib diisi' });

    if (isMongo()) {
      const u = await User.findOne({ username }).lean();
      if (!u || !u.is_active) return res.status(401).json({ message: 'Username atau password salah' });
      const ok = await bcrypt.compare(password, u.password);
      if (!ok) return res.status(401).json({ message: 'Username atau password salah' });
      if (!['admin', 'super_admin', 'admin'].includes(u.role)) {
        return res.status(403).json({ message: 'Hanya admin yang boleh masuk web-admin' });
      }
      req.session.user = { id: String(u._id), username: u.username, role: u.role };
      return res.json({ user: { id: String(u._id), username: u.username, nama_lengkap: u.nama_lengkap, role: u.role } });
    }

    const [rows] = await pool.query(
      `SELECT id, nip, nama_lengkap, username, password, role, is_active
       FROM users WHERE username=? LIMIT 1`, [username]
    );
    const u = rows?.[0];
    if (!u || !u.is_active) return res.status(401).json({ message: 'Username atau password salah' });
    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ message: 'Username atau password salah' });
    if (!['admin', 'super_admin'].includes(u.role)) {
      return res.status(403).json({ message: 'Hanya admin yang boleh masuk web-admin' });
    }
    req.session.user = { id: u.id, username: u.username, role: u.role };
    return res.json({ user: { id: u.id, username: u.username, nama_lengkap: u.nama_lengkap, role: u.role } });
  } catch (e) {
    console.error('AUTH LOGIN ERR', e);
    res.status(500).json({ message: 'Login gagal' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(process.env.COOKIE_NAME || 'sid');
    res.json({ ok: true });
  });
});

export default router;

