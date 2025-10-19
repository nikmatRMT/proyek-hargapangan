// POST /api/node/login
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'harga_pasar_mongo';

module.exports = async (req, res) => {
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
      res.status(400).json({ message: 'Username dan password wajib diisi' });
      return;
    }

    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db(dbName);
      
      // Find user by username
      const user = await db.collection('users').findOne({ username });
      
      if (!user) {
        res.status(401).json({ message: 'Username atau password salah' });
        return;
      }

      // Check if user is active
      if (user.is_active === false) {
        res.status(403).json({ message: 'Akun tidak aktif' });
        return;
      }

      // Verify password with bcrypt
      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        res.status(401).json({ message: 'Username atau password salah' });
        return;
      }

      // Create session token (simple JWT alternative using timestamp + user id)
      const token = Buffer.from(JSON.stringify({
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      })).toString('base64');

      // Save session to MongoDB
      await db.collection('sessions').insertOne({
        userId: user._id,
        token,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({
        message: 'Login berhasil',
        token,
        user: {
          ...userWithoutPassword,
          _id: userWithoutPassword._id.toString()
        }
      });

    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
