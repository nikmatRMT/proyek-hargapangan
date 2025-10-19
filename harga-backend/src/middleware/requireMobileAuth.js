// src/middleware/requireMobileAuth.js
import jwt from 'jsonwebtoken';
import { collections } from '../tools/db.js';

const {
  MOBILE_JWT_SECRET = process.env.JWT_SECRET || 'change_this_mobile_secret',
} = process.env;

export default async function requireMobileAuth(req, res, next) {
  try {
    // Ambil token dari Authorization
    const [scheme, token] = String(req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verifikasi JWT
    const payload = jwt.verify(token, MOBILE_JWT_SECRET);

    // Ambil id dari beberapa kemungkinan field
    const userId =
      payload?.sub ?? payload?.uid ?? payload?.id ?? payload?.userId ?? payload?.user_id;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { users } = collections();
    const u = await users.findOne({ id: Number(userId) }, { projection: { _id: 0 } });
    if (!u || !u.is_active) return res.status(401).json({ message: 'Unauthorized' });

    req.mobileUser = { id: u.id, role: u.role, username: u.username, name: u.nama_lengkap };
    next();
  } catch (_e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
