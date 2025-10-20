// src/routes/users.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { collections, getNextSeq } from '../tools/db.js';
import { uploadToBlob, deleteFromBlob } from '../lib/blob.js';

const router = Router();
const normRole = (r) => (String(r || '').toLowerCase() === 'admin' ? 'admin' : 'petugas');

async function countActiveAdmins() {
  const { users } = collections();
  return users.countDocuments({ role: 'admin', is_active: 1 });
}

/* =========================
   Konfigurasi Upload Avatar - VERCEL BLOB
   ========================= */
// Gunakan memoryStorage agar file disimpan di buffer (tidak ke disk)
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

/* ========== LIST ========== */
router.get('/', async (req, res) => {
  try {
    const role = String(req.query.role || 'all').toLowerCase();
    const { users } = collections();
    const filter = {};
    if (role === 'admin') filter.role = 'admin';
    else if (role === 'petugas') filter.role = 'petugas';

    const rows = await users
      .find(filter, { projection: { _id: 0 } })
      .sort({ role: -1, created_at: -1 })
      .toArray();
    res.json({ data: rows || [] });
  } catch (e) {
    console.error('GET /api/users', e);
    res.status(500).json({ message: 'Gagal mengambil data pengguna' });
  }
});

/* ========== CREATE ========== */
router.post('/', async (req, res) => {
  try {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });

    const {
      nama_lengkap,
      username: usernameRaw,
      phone = null,
      alamat = null,
      role: roleRaw = 'petugas',
      password: plain = null,
      is_active = 1,
      nip: nipRaw = null,
      foto = null,
    } = req.body || {};

    // Normalize input - trim whitespace and lowercase username
    const username = usernameRaw ? String(usernameRaw).trim().toLowerCase() : null;
    // NIP wajib 18 digit
    const nip = (nipRaw && String(nipRaw).trim()) ? String(nipRaw).trim() : null;

    console.log('[CREATE USER] Request body:', { 
      nama_lengkap, 
      username, 
      usernameRaw, 
      nip, 
      nipRaw,
      role: roleRaw 
    });

    if (!nama_lengkap || !username) {
      return res.status(400).json({ message: 'nama_lengkap dan username wajib diisi' });
    }

    // Validasi NIP: wajib 18 digit angka
    if (!nip) {
      return res.status(400).json({ message: 'NIP wajib diisi' });
    }
    if (!/^\d{18}$/.test(nip)) {
      return res.status(400).json({ message: 'NIP harus 18 digit angka' });
    }

    const { users } = collections();
    
    // Count total users for debugging
    const totalUsers = await users.countDocuments();
    console.log('[CREATE USER] Total users in DB:', totalUsers);
    
    // Cek duplikasi username (case-insensitive)
    const uByUsername = await users.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    if (uByUsername) {
      console.log('[CREATE USER] Username conflict:', { 
        requestedUsername: username,
        existingUsername: uByUsername.username,
        existingId: uByUsername.id 
      });
      return res.status(409).json({ message: `Username "${username}" sudah digunakan` });
    }

    if (nip) {
      const uByNip = await users.findOne({ nip });
      if (uByNip) {
        console.log('[CREATE USER] NIP conflict:', { 
          requestedNIP: nip,
          existingNIP: uByNip.nip,
          existingId: uByNip.id 
        });
        return res.status(409).json({ message: `NIP "${nip}" sudah digunakan` });
      }
    }

    const role = normRole(roleRaw);
    const password = (plain && String(plain).length >= 6) ? String(plain) : 'Petugas123!';
    const hash = await bcrypt.hash(password, 10);

    const id = await getNextSeq('users');
    const now = new Date();
    await users.insertOne({
      id,
      nip: nip || null,
      nama_lengkap,
      username,
      password: hash,
      role,
      is_active: is_active ? 1 : 0,
      phone,
      alamat,
      foto,
      created_at: now,
      updated_at: now,
    });

    const row = await users.findOne({ id }, { projection: { _id: 0, password: 0 } });

    return res.status(201).json({
      data: row,
      defaultPassword: plain ? undefined : 'Petugas123!',
    });
  } catch (e) {
    // Tangkap duplicate key dari MongoDB
    if (String(e?.message || '').toLowerCase().includes('duplicate key')) {
      console.error('[CREATE USER] MongoDB duplicate key error:', {
        error: e.message,
        code: e.code,
        keyPattern: e.keyPattern,
        keyValue: e.keyValue,
      });
      
      // Extract field yang duplicate dari error message
      const field = e.keyPattern ? Object.keys(e.keyPattern)[0] : 'unknown';
      const value = e.keyValue ? e.keyValue[field] : 'unknown';
      
      return res.status(409).json({ 
        message: `Data sudah ada (duplikat): ${field} = "${value}"` 
      });
    }
    console.error('POST /api/users', e);
    return res.status(500).json({ message: 'Gagal membuat pengguna' });
  }
});

/* ========== UPDATE ========== */
router.patch('/:id', async (req, res) => {
  try {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });

  const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID tidak valid' });

  const { users } = collections();
  const target = await users.findOne({ id });
    if (!target) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    const patch = {};
    const allow = ['nama_lengkap', 'phone', 'alamat', 'is_active', 'nip', 'foto'];
    for (const k of allow) {
      if (k in req.body) {
        // Normalize: empty string or whitespace only → null
        if (k === 'nip' || k === 'phone' || k === 'alamat') {
          const val = req.body[k];
          patch[k] = (val && String(val).trim()) ? String(val).trim() : null;
        } else {
          patch[k] = req.body[k];
        }
      }
    }

    // Validasi NIP jika diubah: wajib 18 digit angka
    if ('nip' in patch) {
      if (!patch.nip) {
        return res.status(400).json({ message: 'NIP wajib diisi' });
      }
      if (!/^\d{18}$/.test(patch.nip)) {
        return res.status(400).json({ message: 'NIP harus 18 digit angka' });
      }
    }

    if ('role' in req.body) {
      if (actor.role !== 'admin') return res.status(403).json({ message: 'Hanya admin yang boleh mengubah role' });
      patch.role = normRole(req.body.role);
    }

    // Cegah menghilangkan admin terakhir
    if ((target.role === 'admin') && (('role' in patch && patch.role !== 'admin') || ('is_active' in patch && !patch.is_active))) {
      const n = await countActiveAdmins();
      if (n <= 1) return res.status(400).json({ message: 'Tidak boleh menonaktifkan/menurunkan admin terakhir' });
    }

    // Jika mengubah NIP → cek unik (hanya jika tidak null)
    if ('nip' in patch && patch.nip) {
      const dup = await users.findOne({ nip: patch.nip, id: { $ne: id } });
      if (dup) return res.status(409).json({ message: 'NIP sudah digunakan' });
    }

    const fields = Object.keys(patch);
    if (!fields.length) {
      const row = await users.findOne({ id }, { projection: { _id: 0 } });
      return res.json({ data: row });
    }

    const setPatch = { ...patch };
    if ('is_active' in setPatch) setPatch.is_active = setPatch.is_active ? 1 : 0;
    await users.updateOne({ id }, { $set: { ...setPatch, updated_at: new Date() } });

    const row = await users.findOne({ id }, { projection: { _id: 0 } });
    res.json({ data: row });
  } catch (e) {
    console.error('PATCH /api/users/:id', e);
    res.status(500).json({ message: 'Gagal memperbarui pengguna' });
  }
});

/* ========== RESET PASSWORD ========== */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    if (actor.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });

  const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID tidak valid' });
  const { users } = collections();
  const u = await users.findOne({ id }, { projection: { id: 1 } });
  if (!u) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    const { new_password } = req.body || {};
    const targetPass = (new_password && String(new_password).length >= 6) ? String(new_password) : 'Petugas123!';
    const hash = await bcrypt.hash(targetPass, 10);
  await users.updateOne({ id }, { $set: { password: hash, updated_at: new Date() } });

    res.json({ ok: true, defaultPassword: new_password ? undefined : 'Petugas123!' });
  } catch (e) {
    console.error('POST /api/users/:id/reset-password', e);
    res.status(500).json({ message: 'Gagal reset password' });
  }
});

/* ========== DELETE (opsional) ========== */
router.delete('/:id', async (req, res) => {
  try {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    if (actor.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });

  const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID tidak valid' });
  const { users } = collections();
  const u = await users.findOne({ id }, { projection: { id: 1, role: 1 } });
  if (!u) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    if (u.role === 'admin') {
      const n = await countActiveAdmins();
      if (n <= 1) return res.status(400).json({ message: 'Tidak boleh menghapus admin terakhir' });
    }

  await users.deleteOne({ id });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/users/:id', e);
    res.status(500).json({ message: 'Gagal menghapus pengguna' });
  }
});

/* ========== UPLOAD AVATAR: akun yang sedang login ========== */
/** FormData field: "avatar" | "file" | "photo" | "image" */
// Helper middleware untuk mengambil file dari berbagai field name
const getUploadedFile = (req, res, next) => {
  const acceptedFields = ['avatar', 'file', 'photo', 'image'];
  upload.any()(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    // Cari file dari field yang diterima
    if (req.files && req.files.length > 0) {
      const uploadedFile = req.files.find(f => acceptedFields.includes(f.fieldname));
      if (uploadedFile) {
        req.file = uploadedFile; // Simpan di req.file seperti upload.single()
      }
    }
    next();
  });
};

router.post(
  '/me/avatar',
  (req, res, next) => {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    next();
  },
  getUploadedFile,
  async (req, res) => {
    try {
      const actor = req.session.user;
      if (!req.file) return res.status(400).json({ message: 'File avatar wajib' });

      const { users } = collections();
      const current = await users.findOne({ id: actor.id }, { projection: { foto: 1 } });
      const oldFotoUrl = current?.foto || null;

      // Generate filename dengan user ID dan timestamp
      const ext = req.file.mimetype === 'image/png' ? '.png' : 
                  req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
      const filename = `avatars/user-${actor.id}-${Date.now()}${ext}`;

      // Upload ke Vercel Blob
      const blob = await uploadToBlob(req.file.buffer, filename, {
        contentType: req.file.mimetype,
      });

      // Update database dengan URL dari Vercel Blob
      await users.updateOne(
        { id: actor.id }, 
        { $set: { foto: blob.url, updated_at: new Date() } }
      );

      // Hapus foto lama dari Vercel Blob (jika ada)
      if (oldFotoUrl) {
        await deleteFromBlob(oldFotoUrl);
      }

      const user = await users.findOne({ id: actor.id }, { projection: { _id: 0 } });

      return res.json({ ok: true, user, foto: user.foto });
    } catch (e) {
      console.error('POST /api/users/me/avatar', e);
      res.status(500).json({ message: 'Gagal mengunggah avatar' });
    }
  }
);

// Alias untuk /me/avatar (frontend sering coba endpoint ini juga)
router.post('/me/photo', 
  (req, res, next) => {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    next();
  },
  getUploadedFile,
  async (req, res) => {
    try {
      const actor = req.session.user;
      if (!req.file) return res.status(400).json({ message: 'File avatar wajib' });

      const { users } = collections();
      const current = await users.findOne({ id: actor.id }, { projection: { foto: 1 } });
      const oldFotoUrl = current?.foto || null;

      // Generate filename dengan user ID dan timestamp
      const ext = req.file.mimetype === 'image/png' ? '.png' : 
                  req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
      const filename = `avatars/user-${actor.id}-${Date.now()}${ext}`;

      // Upload ke Vercel Blob
      const blob = await uploadToBlob(req.file.buffer, filename, {
        contentType: req.file.mimetype,
      });

      // Update database dengan URL dari Vercel Blob
      await users.updateOne(
        { id: actor.id }, 
        { $set: { foto: blob.url, updated_at: new Date() } }
      );

      // Hapus foto lama dari Vercel Blob (jika ada)
      if (oldFotoUrl) {
        await deleteFromBlob(oldFotoUrl);
      }

      const user = await users.findOne({ id: actor.id }, { projection: { _id: 0 } });

      return res.json({ ok: true, user, foto: user.foto });
    } catch (e) {
      console.error('POST /api/users/me/photo', e);
      res.status(500).json({ message: 'Gagal mengunggah avatar' });
    }
  }
);

/* ========== UPLOAD AVATAR: admin ganti foto user lain (opsional) ========== */
/** FormData field: "avatar" | "file" | "photo" | "image" */
router.post(
  '/:id/photo',
  (req, res, next) => {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    if (actor.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });
    next();
  },
  getUploadedFile,
  async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      if (!Number.isFinite(targetId)) return res.status(400).json({ message: 'ID tidak valid' });
      if (!req.file) return res.status(400).json({ message: 'File avatar wajib' });

      const { users } = collections();
      const current = await users.findOne({ id: targetId }, { projection: { foto: 1 } });
      if (!current) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

      const oldFotoUrl = current?.foto || null;

      // Generate filename dengan target user ID dan timestamp
      const ext = req.file.mimetype === 'image/png' ? '.png' : 
                  req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
      const filename = `avatars/user-${targetId}-${Date.now()}${ext}`;

      // Upload ke Vercel Blob
      const blob = await uploadToBlob(req.file.buffer, filename, {
        contentType: req.file.mimetype,
      });

      // Update database dengan URL dari Vercel Blob
      await users.updateOne(
        { id: targetId }, 
        { $set: { foto: blob.url, updated_at: new Date() } }
      );

      // Hapus foto lama dari Vercel Blob (jika ada)
      if (oldFotoUrl) {
        await deleteFromBlob(oldFotoUrl);
      }

      const user = await users.findOne({ id: targetId }, { projection: { _id: 0 } });

      return res.json({ ok: true, user, foto: user.foto });
    } catch (e) {
      console.error('POST /api/users/:id/photo', e);
      res.status(500).json({ message: 'Gagal mengunggah avatar user' });
    }
  }
);

export default router;
