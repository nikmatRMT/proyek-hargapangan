// api/node/auth-login.js
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

// MongoDB Data API client (more stable in serverless)
async function findOneDataApi(collection, filter) {
  const url = `${process.env.MONGODB_DATA_API_URL}/action/findOne`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.MONGODB_DATA_API_KEY,
    },
    body: JSON.stringify({
      dataSource: process.env.MONGODB_DATA_SOURCE || 'Cluster0',
      database: process.env.MONGODB_DB || 'harga_pasar_mongo',
      collection,
      filter,
    }),
  });
  const data = await res.json();
  return data.document || null;
}

async function insertOneDataApi(collection, document) {
  const url = `${process.env.MONGODB_DATA_API_URL}/action/insertOne`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.MONGODB_DATA_API_KEY,
    },
    body: JSON.stringify({
      dataSource: process.env.MONGODB_DATA_SOURCE || 'Cluster0',
      database: process.env.MONGODB_DB || 'harga_pasar_mongo',
      collection,
      document,
    }),
  });
  return await res.json();
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

    // Find user with Data API
    const user = await findOneDataApi('users', { username });

    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    // Create session token (simple: userId:timestamp base64)
    const userId = user._id?.$oid || user._id?.toString() || String(user._id);
    const token = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
    
    const session = {
      _id: token,
      userId,
      username: user.username,
      role: user.role || 'user',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    // Insert session with Data API
    await insertOneDataApi('sessions', session);

    return res.status(200).json({
      token,
      user: {
        id: userId,
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
