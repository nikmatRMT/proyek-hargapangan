// api/node/test-env.js
// Quick diagnostic endpoint to check env vars

export default async function handler(req, res) {
  // Set CORS for all
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env_vars: {
      MONGODB_URI: process.env.MONGODB_URI ? '✓ Set (hidden)' : '✗ Missing',
      MONGODB_DB: process.env.MONGODB_DB || '✗ Missing',
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '✗ Missing',
      FRONTEND_URL: process.env.FRONTEND_URL || '✗ Missing',
    },
    request: {
      origin: req.headers.origin || 'none',
      referer: req.headers.referer || 'none',
      method: req.method,
    },
    cors_check: {
      allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
      requestOrigin: req.headers.origin || '',
    }
  };
  
  // Test MongoDB connection
  try {
    const { MongoClient } = await import('mongodb');
    
    if (!process.env.MONGODB_URI) {
      diagnostics.mongodb = { status: 'error', message: 'MONGODB_URI not set' };
    } else {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      await client.close();
      
      diagnostics.mongodb = { 
        status: 'connected', 
        message: 'MongoDB connection successful' 
      };
    }
  } catch (error) {
    diagnostics.mongodb = { 
      status: 'error', 
      message: error.message,
      code: error.code
    };
  }
  
  return res.status(200).json(diagnostics);
}
