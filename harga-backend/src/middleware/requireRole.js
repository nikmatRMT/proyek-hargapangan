export default function requireRole(role) {
  return (req, res, next) => {
    const u = req.session?.user;
    if (!u) return res.status(401).json({ message: 'Unauthorized' });
    if (u.role !== role) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
