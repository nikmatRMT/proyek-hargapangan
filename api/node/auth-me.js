// api/node/auth-me.js
import { MongoClient } from 'mongodb';

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
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  
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

    const client = await connectMongo();
    const db = client.db(process.env.MONGODB_DB || 'harga_pasar_mongo');
    const session = await db.collection('sessions').findOne({ _id: token });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt)) {
      await db.collection('sessions').deleteOne({ _id: token });
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
