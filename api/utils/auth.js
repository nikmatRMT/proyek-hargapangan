import jwt from 'jsonwebtoken';

/**
 * Generate JWT token
 * @param {Object} payload 
 * @returns {string}
 */
export function generateToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(payload, secret, {
    expiresIn: '7d', // Token valid for 7 days
  });
}

/**
 * Verify JWT token
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
}

/**
 * Extract token from Authorization header
 * @param {Request} req 
 * @returns {string|null}
 */
export function extractToken(req) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
}

/**
 * Middleware to verify authentication
 * @param {Request} req 
 * @returns {Object} User data from token
 */
export function requireAuth(req) {
  const token = extractToken(req);
  
  if (!token) {
    throw new Error('No token provided');
  }

  return verifyToken(token);
}
