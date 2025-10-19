// api/test-cors.js
// Test endpoint untuk verify CORS headers
// ⚠️ HAPUS FILE INI setelah debugging selesai!

export default function handler(req, res) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || req.headers.referer || '';
  
  console.log('[CORS Test]', {
    origin,
    allowedOrigins,
    method: req.method,
  });

  // Set CORS headers
  if (allowedOrigins.length > 0) {
    const matched = allowedOrigins.find(o => origin.includes(o.replace(/^https?:\/\//, '')));
    if (matched || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin || matched || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  } else {
    // Fallback: allow all if ALLOWED_ORIGINS not set
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    success: true,
    message: 'CORS test successful',
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
    },
    cors: {
      allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : ['* (fallback)'],
      requestOrigin: origin,
      matched: allowedOrigins.find(o => origin.includes(o.replace(/^https?:\/\//, ''))),
    },
  });
}
