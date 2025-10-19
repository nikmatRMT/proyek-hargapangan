// api/node/auth-me.js
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

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const session = await findOneDataApi('sessions', { _id: token });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt)) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Return user info
    return res.status(200).json({
      user: {
        id: session.userId,
        username: session.username,
        role: session.role
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
