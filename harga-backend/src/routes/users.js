// src/routes/users.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import User from '../models/User.js';

const router = Router();

const normRole = (r) => (String(r || '').toLowerCase() === 'admin' ? 'admin' : 'petugas');

async function countActiveAdmins() {
  return User.countDocuments({ role: 'admin', is_active: true });
}

function asRow(doc = {}) {
  return {
    id: String(doc._id),
    nip: doc.nip ?? null,
    nama_lengkap: doc.nama_lengkap,
    username: doc.username,
    role: doc.role,
    is_active: doc.is_active ? 1 : 0,
    phone: doc.phone ?? null,
    alamat: doc.alamat ?? null,
    foto: doc.foto ?? null,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

/* =========================
   Konfigurasi Upload Avatar
   ========================= */
const isVercel = process.env.VERCEL === '1';
const AVATAR_ROOT = isVercel
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'tmp', 'uploads');
const AVATAR_DIR = path.join(AVATAR_ROOT, 'avatar');

try {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
} catch {}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const uid = req?.session?.user?.id || 'me';
    const ext =
      file.mimetype === 'image/png' ? '.png' :
      file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    cb(null, `u${uid}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/image\/(png|jpeg|webp)/.test(file.mimetype)) {
      return cb(new Error('File harus PNG/JPG/WebP'));
    }
    cb(null, true);
  },
});

function tryUnlinkOld(foto?: string | null) {
  if (!foto || typeof foto !== 'string') return;
  if (!foto.startsWith('/uploads/avatar/')) return;
  try {
    const disk = path.resolve(AVATAR_ROOT, foto.replace('/uploads/', ''));
    if (fs.existsSync(disk)) fs.unlinkSync(disk);
  } catch {}
}

/* ========== LIST ========== */
router.get('/', async (req, res) => {
  try {
    const role = String(req.query.role || 'all').toLowerCase();
    const filter: any = {};
    if (role === 'admin') filter.role = 'admin';
    else if (role === 'petugas') filter.role = 'petugas';

    const docs = await User.find(filter, {
      nip: 1,
      nama_lengkap: 1,
      username: 1,
      role: 1,
      is_active: 1,
      phone: 1,
      alamat: 1,
      foto: 1,
      created_at: 1,
      updated_at: 1,
    }).sort({ role: -1, created_at: -1 }).lean();

    res.json({ data: docs.map(asRow) });
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
      username,
      phone = null,
      alamat = null,
      role: roleRaw = 'petugas',
      password: plain = null,
      is_active = 1,
      nip = null,
      foto = null,
    } = req.body || {};

    if (!nama_lengkap || !username) {
      return res.status(400).json({ message: 'nama_lengkap dan username wajib diisi' });
    }

    const dupUsername = await User.findOne({ username }).lean();
    if (dupUsername) {
      return res.status(409).json({ message: 'Username sudah digunakan' });
    }

    if (nip) {
      const dupNip = await User.findOne({ nip }).lean();
      if (dupNip) {
        return res.status(409).json({ message: 'NIP sudah digunakan' });
      }
    }

    const role = normRole(roleRaw);
    const password = (plain && String(plain).length >= 6) ? String(plain) : 'Petugas123!';
    const hash = await bcrypt.hash(password, 10);

    const doc = await User.create({
      nip: nip || null,
      nama_lengkap,
      username,
      password: hash,
      role,
      is_active: Boolean(is_active),
      phone,
      alamat,
      foto,
    });

    res.status(201).json({
      data: asRow(doc.toObject()),
      defaultPassword: plain ? undefined : 'Petugas123!',
    });
  } catch (e) {
    console.error('POST /api/users', e);
    res.status(500).json({ message: 'Gagal membuat pengguna' });
  }
});

/* ========== UPDATE ========== */
router.patch('/:id', async (req, res) => {
  try {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });

    const id = String(req.params.id);
    const target = await User.findById(id).lean();
    if (!target) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    const patch: Record<string, any> = {};
    const allow = ['nama_lengkap', 'phone', 'alamat', 'is_active', 'nip', 'foto'];
    for (const k of allow) if (k in req.body) patch[k] = req.body[k];

    if ('role' in req.body) {
      if (actor.role !== 'admin') return res.status(403).json({ message: 'Hanya admin yang boleh mengubah role' });
      patch.role = normRole(req.body.role);
    }

    if ((target.role === 'admin') && (('role' in patch && patch.role !== 'admin') || ('is_active' in patch && !patch.is_active))) {
      const n = await countActiveAdmins();
      if (n <= 1) return res.status(400).json({ message: 'Tidak boleh menonaktifkan/menurunkan admin terakhir' });
    }

    if ('nip' in patch && patch.nip) {
      const dup = await User.findOne({ nip: patch.nip, _id: { $ne: id } }).lean();
      if (dup) return res.status(409).json({ message: 'NIP sudah digunakan' });
    }

    if (Object.keys(patch).length === 0) {
      const doc = await User.findById(id).lean();
      return res.json({ data: asRow(doc) });
    }

    await User.findByIdAndUpdate(id, patch, { new: false });
    const updated = await User.findById(id).lean();
    res.json({ data: asRow(updated) });
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

    const id = String(req.params.id);
    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    const { new_password } = req.body || {};
    const targetPass = (new_password && String(new_password).length >= 6) ? String(new_password) : 'Petugas123!';
    const hash = await bcrypt.hash(targetPass, 10);
    await User.findByIdAndUpdate(id, { password: hash });

    res.json({ ok: true, defaultPassword: new_password ? undefined : 'Petugas123!' });
  } catch (e) {
    console.error('POST /api/users/:id/reset-password', e);
    res.status(500).json({ message: 'Gagal reset password' });
  }
});

/* ========== DELETE ========== */
router.delete('/:id', async (req, res) => {
  try {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    if (actor.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });

    const id = String(req.params.id);
    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    if (user.role === 'admin') {
      const n = await countActiveAdmins();
      if (n <= 1) return res.status(400).json({ message: 'Tidak boleh menghapus admin terakhir' });
    }

    await User.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/users/:id', e);
    res.status(500).json({ message: 'Gagal menghapus pengguna' });
  }
});

/* ========== UPLOAD AVATAR (akun login) ========== */
router.post(
  '/me/avatar',
  (req, res, next) => {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    next();
  },
  upload.single('avatar'),
  async (req, res) => {
    try {
      const actor = req.session.user;
      if (!req.file) return res.status(400).json({ message: 'File avatar wajib' });

      const current = await User.findById(actor.id, { foto: 1 }).lean();
      const publicUrl = '/uploads/avatar/' + req.file.filename;
      await User.findByIdAndUpdate(actor.id, { foto: publicUrl });
      tryUnlinkOld(current?.foto ?? null);

      const updated = await User.findById(actor.id).lean();
      res.json({ ok: true, user: asRow(updated), foto: asRow(updated).foto });
    } catch (e) {
      console.error('POST /api/users/me/avatar', e);
      res.status(500).json({ message: 'Gagal mengunggah avatar' });
    }
  }
);

/* ========== UPLOAD AVATAR (admin ubah user lain) ========== */
router.post(
  '/:id/photo',
  (req, res, next) => {
    const actor = req.session?.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    if (actor.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });
    next();
  },
  upload.single('avatar'),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!req.file) return res.status(400).json({ message: 'File avatar wajib' });

      const current = await User.findById(id, { foto: 1 }).lean();
      if (!current) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

      const publicUrl = '/uploads/avatar/' + req.file.filename;
      await User.findByIdAndUpdate(id, { foto: publicUrl });
      tryUnlinkOld(current.foto ?? null);

      const updated = await User.findById(id).lean();
      res.json({ ok: true, user: asRow(updated), foto: asRow(updated).foto });
    } catch (e) {
      console.error('POST /api/users/:id/photo', e);
      res.status(500).json({ message: 'Gagal mengunggah avatar user' });
    }
  }
);

export default router;
