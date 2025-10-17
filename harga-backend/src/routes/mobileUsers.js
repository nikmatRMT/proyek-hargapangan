// src/routes/mobileUsers.js
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pool } from '../tools/db.js';
import requireMobileAuth from '../middleware/requireMobileAuth.js';

const router = Router();

// Lokasi upload: gunakan os.tmpdir() pada Vercel (read-only di /var/task)
const isVercel = process.env.VERCEL === '1';
const UPLOAD_ROOT = isVercel
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'tmp', 'uploads');
const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatar');
try {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
} catch (_) {
  // Abaikan jika tidak bisa membuat (akan dibuat saat pertama upload)
}

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
function safeRemoveOld(oldPublicUrl) {
  try {
    if (!oldPublicUrl) return;
    // Ekspektasi: oldPublicUrl = "/uploads/avatar/filename.ext"
    const base = '/uploads/avatar/';
    if (!String(oldPublicUrl).startsWith(base)) return;
    const fname = path.basename(oldPublicUrl);
    const abs = path.join(AVATAR_DIR, fname);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
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

    // hapus lama jika masih di folder avatar (opsional)
    safeRemoveOld(old);

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
