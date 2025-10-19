// api/debug-env.js
// Endpoint untuk cek environment variables yang ter-set di Vercel
// ⚠️ HAPUS FILE INI setelah debugging selesai!

export default function handler(req, res) {
  // Set CORS headers
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || req.headers.referer || '';
  
  if (allowedOrigins.length > 0) {
    const matched = allowedOrigins.find(o => origin.includes(o.replace(/^https?:\/\//, '')));
    if (matched || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin || matched || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return status environment variables (tanpa expose nilai sebenarnya)
  const envStatus = {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'local',
    variables: {
      MONGODB_URI: process.env.MONGODB_URI ? '✅ SET' : '❌ NOT SET',
      MONGODB_DB: process.env.MONGODB_DB || '❌ NOT SET',
      MONGODB_DATA_API_URL: process.env.MONGODB_DATA_API_URL ? '✅ SET' : '❌ NOT SET',
      MONGODB_DATA_API_KEY: process.env.MONGODB_DATA_API_KEY ? '✅ SET' : '❌ NOT SET',
      MONGODB_DATA_SOURCE: process.env.MONGODB_DATA_SOURCE || '❌ NOT SET',
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '❌ NOT SET',
      FRONTEND_URL: process.env.FRONTEND_URL || '❌ NOT SET',
    },
    // Untuk debugging CORS
    requestOrigin: origin,
    allowedOriginsList: allowedOrigins.length > 0 ? allowedOrigins : ['(none - will allow *)'],
  };

  res.status(200).json(envStatus);
}
