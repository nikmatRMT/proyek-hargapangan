/**
 * Simple test endpoint - no dependencies
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env_check: {
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'MISSING',
      MONGODB_DB: process.env.MONGODB_DB || 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'MISSING',
    },
  });
}
