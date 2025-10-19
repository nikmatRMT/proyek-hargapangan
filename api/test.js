import { getDB } from './utils/mongo.js';

/**
 * Test endpoint to verify environment variables and MongoDB connection
 */
export default async function handler(req, res) {
  // Handle CORS
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const result = {
      timestamp: new Date().toISOString(),
      environment: {
        MONGODB_URI: process.env.MONGODB_URI ? '✓ Set (hidden)' : '✗ Missing',
        MONGODB_DB: process.env.MONGODB_DB || '✗ Missing',
        JWT_SECRET: process.env.JWT_SECRET ? '✓ Set (hidden)' : '✗ Missing',
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '✗ Missing',
      },
      mongodb: {
        status: 'testing...',
      },
    };

    // Test MongoDB connection
    try {
      const db = await getDB();
      const collections = await db.listCollections().toArray();
      result.mongodb = {
        status: 'connected',
        database: db.databaseName,
        collections: collections.map(c => c.name),
      };
    } catch (error) {
      result.mongodb = {
        status: 'error',
        message: error.message,
      };
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
}
