/**
 * Set CORS headers based on allowed origins
 * @param {Request} req 
 * @returns {Object} Headers object
 */
export function getCorsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed => 
    origin.includes(allowed.trim())
  );

  if (isAllowed || !origin) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  }

  return {};
}

/**
 * Handle CORS preflight request
 * @param {Request} req 
 * @returns {Response|null} Response if OPTIONS, null otherwise
 */
export function handleCors(req) {
  if (req.method === 'OPTIONS') {
    const headers = getCorsHeaders(req);
    return new Response(null, { status: 204, headers });
  }
  return null;
}

/**
 * Add CORS headers to response
 * @param {Response} response 
 * @param {Request} req 
 * @returns {Response}
 */
export function addCorsHeaders(response, req) {
  const corsHeaders = getCorsHeaders(req);
  const newHeaders = new Headers(response.headers);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
