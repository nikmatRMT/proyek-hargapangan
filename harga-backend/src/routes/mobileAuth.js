// src/routes/mobileAuth.js
import { Router } from 'express';
import { collections } from '../tools/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.MOBILE_JWT_SECRET || 'dev_mobile_secret';
const JWT_EXPIRES = process.env.MOBILE_JWT_EXPIRES || '7d';

// Middleware auth Bearer untuk rute mobile (biarkan seperti semula)
function authMobile(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.mobile = payload; // { uid, role }
    next();
  } catch {
    return res.status(401).json({ message: 'Token tidak valid' });
  }
}

// === LOGIN ===
router.post('/login', async (req, res) => {
  try {
    const { identity, password } = req.body ?? {};
    if (!identity || !password)
      return res.status(400).json({ message: 'identity & password wajib diisi' });

    const { users } = collections();
    const u = await users.findOne(
      { $or: [{ username: identity }, { nip: identity }] },
      { projection: { _id: 0 } }
    );
    if (!u || !u.is_active) return res.status(401).json({ message: 'Akun tidak aktif / tidak ditemukan' });
    if (u.role !== 'petugas') return res.status(403).json({ message: 'Hanya petugas yang boleh masuk aplikasi mobile' });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ message: 'Username/NIP atau password salah' });

    const token = jwt.sign({ uid: u.id, role: u.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // ⬇️ kirim foto & updated_at agar langsung tersimpan di AsyncStorage
    res.json({
      token,
      user: {
        id: u.id,
        username: u.username,
        nama_lengkap: u.nama_lengkap,
        nip: u.nip,
        role: u.role,
        phone: u.phone,
        alamat: u.alamat,
        foto: u.foto || null,
        updated_at: u.updated_at,
      },
    });
  } catch (e) {
    console.error('MOBILE LOGIN ERR', e);
    res.status(500).json({ message: 'Login gagal' });
  }
});

// === ME ===
router.get('/me', authMobile, async (req, res) => {
  const { users } = collections();
  const u = await users.findOne(
    { id: req.mobile.uid },
    { projection: { _id: 0 } }
  );
  if (!u || !u.is_active) return res.status(401).json({ message: 'Akun tidak aktif' });

  // ⬇️ balas termasuk foto & updated_at
  res.json({
    user: {
      id: u.id,
      username: u.username,
      nama_lengkap: u.nama_lengkap,
      nip: u.nip,
      role: u.role,
      phone: u.phone,
      alamat: u.alamat,
      foto: u.foto || null,
      updated_at: u.updated_at,
    },
  });
});

// (opsional) change-password tetap sama
router.post('/change-password', authMobile, async (req, res) => {
  try {
    const { old_password, new_password } = req.body ?? {};
    if (!old_password || !new_password || String(new_password).length < 6)
      return res.status(400).json({ message: 'Password baru minimal 6 karakter' });

  const { users } = collections();
  const u = await users.findOne({ id: req.mobile.uid }, { projection: { password: 1, id: 1 } });
    if (!u) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    const ok = await bcrypt.compare(old_password, u.password);
    if (!ok) return res.status(401).json({ message: 'Password lama salah' });

    const hash = await bcrypt.hash(String(new_password), 10);
  await users.updateOne({ id: req.mobile.uid }, { $set: { password: hash, updated_at: new Date() } });
    res.json({ ok: true });
  } catch (e) {
    console.error('MOBILE CHANGE PWD ERR', e);
    res.status(500).json({ message: 'Gagal mengganti password' });
  }
});

export default router;
