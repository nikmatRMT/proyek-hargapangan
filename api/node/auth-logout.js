// api/node/auth-logout.js
// Endpoint untuk logout: hapus session dari MongoDB

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'harga_pasar_mongo';

let cachedClient = null;

async function getMongoClient() {
  if (cachedClient) return cachedClient;
  if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  // Set CORS headers
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || req.headers.referer || '';
  
  if (allowedOrigins.length > 0) {
    const matched = allowedOrigins.find(o => origin.includes(o.replace(/^https?:\/\//, '')));
    if (matched || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ambil token dari cookie atau Authorization header
    const cookieToken = req.cookies?.token;
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Decode token (base64)
    let decoded;
    try {
      const json = Buffer.from(token, 'base64').toString('utf-8');
      decoded = JSON.parse(json);
    } catch {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const { userId, sessionId } = decoded;
    if (!userId || !sessionId) {
      return res.status(401).json({ error: 'Invalid token data' });
    }

    // Connect ke MongoDB dan hapus session
    const client = await getMongoClient();
    const db = client.db(MONGODB_DB);
    const sessionsCol = db.collection('sessions');

    await sessionsCol.deleteOne({ _id: new ObjectId(sessionId) });

    // Clear cookie
    res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0');

    return res.status(200).json({ 
      success: true,
      message: 'Logged out successfully'
    });

  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
}
