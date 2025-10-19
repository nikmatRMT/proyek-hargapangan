// api/node/auth-login.js
// Alias untuk /auth/login → redirect ke /api/node/login

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
    // Fallback: allow origin from request
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  // Set CORS headers first
  setCorsHeaders(req, res);
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Forward request ke endpoint login yang sebenarnya
  const loginModule = await import('./login.js');
  return loginModule.default(req, res);
}
