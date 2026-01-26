export default function requireRole(role) {
  return (req, res, next) => {
    const u = req.session?.user;
    console.log('Memeriksa peran pengguna:', req.session?.user?.role, 'Peran yang diperlukan:', role);

    if (!u) {
      console.error('Otorisasi gagal: Tidak ada pengguna dalam sesi');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (u.role !== role) {
      console.error(`Otorisasi gagal: Peran pengguna (${u.role}) tidak sesuai dengan peran yang diperlukan (${role})`);
      return res.status(403).json({ message: 'Forbidden' });
    }

    console.log('Otorisasi berhasil:', u);
    next();
  };
}
