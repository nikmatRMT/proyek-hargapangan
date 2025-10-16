// src/middleware/auth.js
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

export function requireRole(role) {
  return function (req, res, next) {
    const u = req.session?.user;
    if (!u) return res.status(401).json({ message: 'Unauthorized' });
    if (u.role !== role) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
