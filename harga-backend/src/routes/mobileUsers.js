// src/routes/mobileUsers.js
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from '../tools/db.js';
import requireMobileAuth from '../middleware/requireMobileAuth.js';

const router = Router();

// simpan di tmp/uploads/avatar
const AVATAR_DIR = path.resolve('tmp/uploads/avatar');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    const id = req.mobileUser?.id || 'user';
    const ts = Date.now();
    cb(null, `avatar_${id}_${ts}${ext}`);
  },
});
const upload = multer({ storage });

// Helper: hapus file lama jika masih di folder avatar
function safeRemoveOld(oldPath) {
  try {
    if (!oldPath) return;
    // oldPath bentuknya "/uploads/avatar/xxx.jpg"
    const abs = path.resolve(oldPath.replace(/^\/+/, '')); // hapus leading slash
    if (abs.startsWith(path.resolve('uploads')) || abs.startsWith(path.resolve('tmp/uploads'))) {
      // Kalau dulu diserve dari tmp/uploads, path relatifnya "/uploads/.."
    }
  } catch {}
}

router.get('/me', requireMobileAuth, async (req, res) => {
  const id = req.mobileUser.id;
  const [[u]] = await pool.query(
    `SELECT id, nip, nama_lengkap AS name, username, role, is_active,
            phone, alamat, foto, created_at
     FROM users WHERE id=? LIMIT 1`, [id]);
  if (!u) return res.status(404).json({ message: 'User tidak ditemukan' });
  res.json({ user: u });
});

// POST /m/users/me/avatar  (FormData field: "avatar")
router.post('/me/avatar', requireMobileAuth, upload.single('avatar'), async (req, res) => {
  try {
    const me = req.mobileUser;
    if (!me?.id) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'File avatar wajib diupload' });

    // path publik untuk diserve via express.static('/uploads', ...)
    const publicPath = `/uploads/avatar/${req.file.filename}`;

    // ambil foto lama
    const [[row]] = await pool.query('SELECT foto FROM users WHERE id=?', [me.id]);
    const old = row?.foto;

    await pool.query('UPDATE users SET foto=?, updated_at=NOW() WHERE id=?', [publicPath, me.id]);

    // hapus lama jika masih di folder avatar tmp/uploads (opsional)
    try {
      if (old && /^\/?uploads\/avatar\//.test(old)) {
        const abs = path.resolve(old.replace(/^\//, '')); // "uploads/avatar/.."
        fs.existsSync(abs) && fs.unlinkSync(abs);
      }
    } catch {}

    const [[fresh]] = await pool.query(
      `SELECT id, nip, nama_lengkap AS name, username, role, is_active,
              phone, alamat, foto, created_at
       FROM users WHERE id=?`, [me.id]);

    res.json({ ok: true, user: fresh });
  } catch (e) {
    console.error('POST /m/users/me/avatar', e);
    res.status(500).json({ message: 'Gagal upload avatar' });
  }
});

export default router;
