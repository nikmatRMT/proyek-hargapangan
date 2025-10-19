// api/node/auth-login.js
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

function setCorsHeaders(req, res) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || req.headers.referer || '';
  
  if (allowedOrigins.length > 0) {
    const matched = allowedOrigins.find(o => origin.includes(o.replace(/^https?:\/\//, '')));
    if (matched || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin || matched || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

let cachedClient = null;

async function connectMongo() {
  if (cachedClient) return cachedClient;
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password harus diisi' });
    }

    const client = await connectMongo();
    const db = client.db(process.env.MONGODB_DB);
    const user = await db.collection('users').findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    // Create session token
    const token = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');
    const session = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role || 'user',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 jam
    };

    await db.collection('sessions').insertOne({ _id: token, ...session });

    return res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        nama: user.nama,
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
