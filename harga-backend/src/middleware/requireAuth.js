export default function requireAuth(req, res, next) {
  console.log('Memeriksa autentikasi pengguna:', req.session?.user);

  if (!req.session?.user) {
    console.error('Autentikasi gagal: Tidak ada pengguna dalam sesi');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  console.log('Autentikasi berhasil:', req.session.user);
  next();
}
