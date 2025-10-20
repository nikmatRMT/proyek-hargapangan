// src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { collections } from '../tools/db.js';

const router = Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) return res.status(400).json({ message: 'username/NIP & password wajib diisi' });

    const { users } = collections();
    
    // Cari user berdasarkan username ATAU NIP (case-insensitive untuk username)
    const identifier = String(username).trim();
    const u = await users.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }, // Username (case-insensitive)
        { nip: identifier }  // NIP (exact match)
      ]
    });
    
    if (!u || !u.is_active) return res.status(401).json({ message: 'Username/NIP atau password salah' });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ message: 'Username/NIP atau password salah' });

    if (!['admin', 'super_admin'].includes(u.role)) {
      return res.status(403).json({ message: 'Hanya admin yang boleh masuk web-admin' });
    }

    req.session.user = { id: u.id, username: u.username, role: u.role };
    
    // Force save session before sending response
    req.session.save((err) => {
      if (err) {
        console.error('[LOGIN] Session save error:', err);
        return res.status(500).json({ message: 'Gagal menyimpan session' });
      }
      
      console.log('[LOGIN] Session saved successfully:', { 
        sessionID: req.sessionID,
        user: req.session.user 
      });
      
      res.json({
        user: { id: u.id, username: u.username, nama_lengkap: u.nama_lengkap, role: u.role }
      });
    });
  } catch (e) {
    console.error('AUTH LOGIN ERR', e);
    res.status(500).json({ message: 'Login gagal' });
  }
});


export default router;
