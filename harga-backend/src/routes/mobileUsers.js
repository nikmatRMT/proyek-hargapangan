// src/routes/mobileUsers.js
import { Router } from 'express';
import multer from 'multer';
import { collections } from '../tools/db.js';
import requireMobileAuth from '../middleware/requireMobileAuth.js';
import { uploadToBlob, deleteFromBlob } from '../lib/blob.js';

const router = Router();

// Gunakan memoryStorage untuk Vercel Blob (tidak pakai disk)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (_req, file, cb) => {
    if (!/image\/(png|jpeg|webp)/.test(file.mimetype)) {
      return cb(new Error('File harus PNG/JPG/WebP'));
    }
    cb(null, true);
  },
});

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

    const { users } = collections();
    const current = await users.findOne({ id: me.id }, { projection: { foto: 1 } });
    const oldFotoUrl = current?.foto || null;

    // Generate filename untuk Vercel Blob
    const ext = req.file.mimetype === 'image/png' ? '.png' : 
                req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const filename = `avatars/user-${me.id}-${Date.now()}${ext}`;

    // Upload ke Vercel Blob
    const blob = await uploadToBlob(req.file.buffer, filename, {
      contentType: req.file.mimetype,
    });

    // Update database dengan URL dari Vercel Blob
    await users.updateOne(
      { id: me.id }, 
      { $set: { foto: blob.url, updated_at: new Date() } }
    );

    // Hapus foto lama dari Vercel Blob (jika ada)
    if (oldFotoUrl) {
      await deleteFromBlob(oldFotoUrl).catch(err => {
        console.warn('[Mobile Avatar] Failed to delete old foto from Blob:', err.message);
      });
    }

    const fresh = await users.findOne(
      { id: me.id },
      { projection: { _id: 0, id: 1, nip: 1, nama_lengkap: 1, username: 1, role: 1, is_active: 1, phone: 1, alamat: 1, foto: 1, updated_at: 1, created_at: 1 } }
    );

    res.json({ ok: true, user: { ...fresh, name: fresh?.nama_lengkap } });
  } catch (e) {
    console.error('POST /m/users/me/avatar', e);
    res.status(500).json({ message: 'Gagal upload avatar' });
  }
});

export default router;
