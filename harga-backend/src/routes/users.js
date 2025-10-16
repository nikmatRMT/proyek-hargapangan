// src/routes/users.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../tools/db.js';

const router = Router();
const normRole = (r) => (String(r || '').toLowerCase() === 'admin' ? 'admin' : 'petugas');

async function countActiveAdmins() {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND is_active=1");
  return rows?.[0]?.n ?? 0;
}

/* =========================
   Konfigurasi Upload Avatar
   ========================= */
const AVATAR_ROOT = path.resolve('tmp/uploads');
const AVATAR_DIR  = path.resolve(AVATAR_ROOT, 'avatar');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const uid = req?.session?.user?.id || 'me';
    const ext =
      file.mimetype === 'image/png'  ? '.png'  :
      file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    cb(null, `u${uid}-${Date.now()}${ext}`);
  },
});

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

function tryUnlinkOld(foto) {
  try {
    if (foto && typeof foto === 'string' && foto.startsWith('/uploads/avatar/')) {
      const disk = path.resolve(AVATAR_ROOT, foto.replace('/uploads/', ''));
      if (fs.existsSync(disk)) fs.unlinkSync(disk);
    }
  } catch {}
}

/* ========== LIST ========== */
router.get('/', async (req, res) => {
  try {
    const role = String(req.query.role || 'all').toLowerCase();
    let sql = `
      SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
      FROM users
    `;
    if (role === 'admin') sql += " WHERE role='admin'";
    else if (role === 'petugas') sql += " WHERE role='petugas'";
    sql += " ORDER BY role='admin' DESC, created_at DESC";

    const [rows] = await pool.query(sql);
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

    // Cek duplikasi lebih dulu agar tidak meledak jadi 500
    const [[uByUsername]] = await pool.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (uByUsername) {
      return res.status(409).json({ message: 'Username sudah digunakan' });
    }

    if (nip) {
      const [[uByNip]] = await pool.query(
        'SELECT id FROM users WHERE nip = ? LIMIT 1',
        [nip]
      );
      if (uByNip) {
        return res.status(409).json({ message: 'NIP sudah digunakan' });
      }
    }

    const role = normRole(roleRaw);
    const password = (plain && String(plain).length >= 6) ? String(plain) : 'Petugas123!';
    const hash = await bcrypt.hash(password, 10);

    const [ins] = await pool.query(
      `INSERT INTO users (nip, nama_lengkap, username, password, role, is_active, phone, alamat, foto, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [nip || null, nama_lengkap, username, hash, role, is_active ? 1 : 0, phone, alamat, foto]
    );

    const id = ins.insertId;
    const [[row]] = await pool.query(
      `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
       FROM users WHERE id=?`,
      [id]
    );

    return res.status(201).json({
      data: row,
      defaultPassword: plain ? undefined : 'Petugas123!',
    });
  } catch (e) {
    // Tangkap ER_DUP_ENTRY sebagai 409 dengan pesan yang pas
    if (e?.code === 'ER_DUP_ENTRY') {
      const msg = String(e?.sqlMessage || '').toLowerCase();
      if (msg.includes("for key 'users.username'")) {
        return res.status(409).json({ message: 'Username sudah digunakan' });
      }
      if (msg.includes("for key 'users.nip'")) {
        return res.status(409).json({ message: 'NIP sudah digunakan' });
      }
      return res.status(409).json({ message: 'Data sudah ada (duplikat)' });
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

    const [[target]] = await pool.query('SELECT * FROM users WHERE id=?', [id]);
    if (!target) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    const patch = {};
    const allow = ['nama_lengkap', 'phone', 'alamat', 'is_active', 'nip', 'foto'];
    for (const k of allow) if (k in req.body) patch[k] = req.body[k];

    if ('role' in req.body) {
      if (actor.role !== 'admin') return res.status(403).json({ message: 'Hanya admin yang boleh mengubah role' });
      patch.role = normRole(req.body.role);
    }

    // Cegah menghilangkan admin terakhir
    if ((target.role === 'admin') && (('role' in patch && patch.role !== 'admin') || ('is_active' in patch && !patch.is_active))) {
      const n = await countActiveAdmins();
      if (n <= 1) return res.status(400).json({ message: 'Tidak boleh menonaktifkan/menurunkan admin terakhir' });
    }

    // Jika mengubah NIP → cek unik
    if ('nip' in patch && patch.nip) {
      const [[dup]] = await pool.query('SELECT id FROM users WHERE nip=? AND id<>? LIMIT 1', [patch.nip, id]);
      if (dup) return res.status(409).json({ message: 'NIP sudah digunakan' });
    }

    const fields = Object.keys(patch);
    if (!fields.length) {
      const [[row]] = await pool.query(
        `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
         FROM users WHERE id=?`,
        [id]
      );
      return res.json({ data: row });
    }

    const sets = fields.map(k => `${k}=?`).join(', ');
    const args = fields.map(k => (k === 'is_active' ? (patch[k] ? 1 : 0) : patch[k]));
    args.push(id);
    await pool.query(`UPDATE users SET ${sets}, updated_at=NOW() WHERE id=?`, args);

    const [[row]] = await pool.query(
      `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
       FROM users WHERE id=?`,
      [id]
    );
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

    const [[u]] = await pool.query('SELECT id FROM users WHERE id=?', [id]);
    if (!u) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    const { new_password } = req.body || {};
    const targetPass = (new_password && String(new_password).length >= 6) ? String(new_password) : 'Petugas123!';
    const hash = await bcrypt.hash(targetPass, 10);
    await pool.query('UPDATE users SET password=?, updated_at=NOW() WHERE id=?', [hash, id]);

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

    const [[u]] = await pool.query('SELECT id, role FROM users WHERE id=?', [id]);
    if (!u) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

    if (u.role === 'admin') {
      const n = await countActiveAdmins();
      if (n <= 1) return res.status(400).json({ message: 'Tidak boleh menghapus admin terakhir' });
    }

    await pool.query('DELETE FROM users WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/users/:id', e);
    res.status(500).json({ message: 'Gagal menghapus pengguna' });
  }
});

/* ========== UPLOAD AVATAR: akun yang sedang login ========== */
/** FormData field: "avatar" */
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

      // foto lama
      const [[current]] = await pool.query('SELECT foto FROM users WHERE id=?', [actor.id]);
      const oldFoto = current?.foto || null;

      const publicUrl = '/uploads/avatar/' + req.file.filename;

      await pool.query('UPDATE users SET foto=?, updated_at=NOW() WHERE id=?', [publicUrl, actor.id]);

      tryUnlinkOld(oldFoto);

      const [[user]] = await pool.query(
        `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
         FROM users WHERE id=?`,
        [actor.id]
      );

      return res.json({ ok: true, user, foto: user.foto });
    } catch (e) {
      console.error('POST /api/users/me/avatar', e);
      res.status(500).json({ message: 'Gagal mengunggah avatar' });
    }
  }
);

/* ========== UPLOAD AVATAR: admin ganti foto user lain (opsional) ========== */
/** FormData field: "avatar" */
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
      const targetId = Number(req.params.id);
      if (!Number.isFinite(targetId)) return res.status(400).json({ message: 'ID tidak valid' });
      if (!req.file) return res.status(400).json({ message: 'File avatar wajib' });

      const [[current]] = await pool.query('SELECT foto FROM users WHERE id=?', [targetId]);
      if (!current) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

      const publicUrl = '/uploads/avatar/' + req.file.filename;

      await pool.query('UPDATE users SET foto=?, updated_at=NOW() WHERE id=?', [publicUrl, targetId]);

      tryUnlinkOld(current.foto || null);

      const [[user]] = await pool.query(
        `SELECT id, nip, nama_lengkap, username, role, is_active, phone, alamat, foto, created_at, updated_at
         FROM users WHERE id=?`,
        [targetId]
      );

      return res.json({ ok: true, user, foto: user.foto });
    } catch (e) {
      console.error('POST /api/users/:id/photo', e);
      res.status(500).json({ message: 'Gagal mengunggah avatar user' });
    }
  }
);

export default router;
