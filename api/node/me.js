// GET /api/node/me - Get current logged in user
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'harga_pasar_mongo';

function extractToken(req) {
  // From Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // From cookie (if set by frontend)
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/token=([^;]+)/);
  if (match) return match[1];
  
  return null;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const token = extractToken(req);
  
  if (!token) {
    res.status(401).json({ message: 'Unauthorized - No token provided' });
    return;
  }

  try {
    // Decode token
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Check expiration
    if (decoded.exp && Date.now() > decoded.exp) {
      res.status(401).json({ message: 'Token expired' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    
    // Verify session exists
    const session = await db.collection('sessions').findOne({ token });
    if (!session) {
      await client.close();
      res.status(401).json({ message: 'Invalid session' });
      return;
    }

    // Get user
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(decoded.userId) 
    });
    
    await client.close();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      user: {
        ...userWithoutPassword,
        _id: userWithoutPassword._id.toString()
      }
    });

  } catch (err) {
    console.error('Me error:', err);
    res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};
