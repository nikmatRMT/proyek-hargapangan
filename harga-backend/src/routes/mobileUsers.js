// src/routes/mobileUsers.js
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { collections } from '../tools/db.js';
import requireMobileAuth from '../middleware/requireMobileAuth.js';

const router = Router();

// Use /tmp in serverless, tmp/ locally
const AVATAR_DIR = process.env.NODE_ENV === 'production' 
  ? path.resolve('/tmp/uploads/avatar')
  : path.resolve('tmp/uploads/avatar');

// Ensure directory exists (with error handling for serverless environments)
try {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
} catch (err) {
  console.warn('Warning: Could not create avatar directory:', err.message);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      fs.mkdirSync(AVATAR_DIR, { recursive: true });
      cb(null, AVATAR_DIR);
    } catch (err) {
      cb(new Error('Gagal membuat folder upload: ' + err.message));
    }
  },
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
  const { users } = collections();
  const u = await users.findOne(
    { id },
    { projection: { _id: 0, id: 1, nip: 1, nama_lengkap: 1, username: 1, role: 1, is_active: 1, phone: 1, alamat: 1, foto: 1, created_at: 1 } }
  );
  if (!u) return res.status(404).json({ message: 'User tidak ditemukan' });
  res.json({ user: { ...u, name: u.nama_lengkap } });
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
  const { users } = collections();
  const current = await users.findOne({ id: me.id }, { projection: { foto: 1 } });
  const old = current?.foto;

  await users.updateOne({ id: me.id }, { $set: { foto: publicPath, updated_at: new Date() } });

    // hapus lama jika masih di folder avatar tmp/uploads (opsional)
    try {
      if (old && /^\/?uploads\/avatar\//.test(old)) {
        const abs = path.resolve(old.replace(/^\//, '')); // "uploads/avatar/.."
        fs.existsSync(abs) && fs.unlinkSync(abs);
      }
    } catch {}

    const fresh = await users.findOne(
      { id: me.id },
      { projection: { _id: 0, id: 1, nip: 1, nama_lengkap: 1, username: 1, role: 1, is_active: 1, phone: 1, alamat: 1, foto: 1, created_at: 1 } }
    );

    res.json({ ok: true, user: { ...fresh, name: fresh?.nama_lengkap } });
  } catch (e) {
    console.error('POST /m/users/me/avatar', e);
    res.status(500).json({ message: 'Gagal upload avatar' });
  }
});

export default router;
