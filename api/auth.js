import bcrypt from 'bcryptjs';
import { getCollection } from './utils/mongo.js';
import { generateToken, requireAuth } from './utils/auth.js';
import { handleCors, addCorsHeaders } from './utils/cors.js';

/**
 * Main auth handler - handles login, logout, me endpoints
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || req.headers.referer || '';
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    const isAllowed = allowedOrigins.some(allowed => origin.includes(allowed.trim()));
    
    if (isAllowed || !origin) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      return res.status(204).end();
    }
  }

  try {
    const path = req.url;

    // Set CORS headers
    const origin = req.headers.origin || req.headers.referer || '';
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    const isAllowed = allowedOrigins.some(allowed => origin.includes(allowed.trim()));
    
    if (isAllowed || !origin) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Route to appropriate handler
    if (path === '/api/auth/login' || path === '/auth/login') {
      return await handleLogin(req, res);
    }

    if (path === '/api/auth/me' || path === '/auth/me') {
      return await handleMe(req, res);
    }

    if (path === '/api/auth/logout' || path === '/auth/logout') {
      return await handleLogout(req, res);
    }

    // 404 for unknown paths
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Handle login
 */
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Get user from database
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      nama_lengkap: user.nama_lengkap,
    });

    // Return token and user info
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * Handle get current user (me)
 */
async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    const userData = jwt.default.verify(token, secret);

    // Optionally fetch fresh user data from database
    const usersCollection = await getCollection('users');
    const { ObjectId } = await import('mongodb');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userData.id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(401).json({ error: error.message });
  }
}

/**
 * Handle logout
 */
async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // JWT-based auth doesn't need server-side logout
  // Client just needs to delete the token
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}
