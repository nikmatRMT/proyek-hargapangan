import bcrypt from 'bcryptjs';
import { getCollection } from './utils/mongo.js';
import { generateToken, requireAuth } from './utils/auth.js';
import { handleCors, addCorsHeaders } from './utils/cors.js';

/**
 * Main auth handler - handles login, logout, me endpoints
 */
export default async function handler(req) {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Route to appropriate handler
    if (path === '/api/auth/login' || path === '/auth/login') {
      return await handleLogin(req);
    }

    if (path === '/api/auth/me' || path === '/auth/me') {
      return await handleMe(req);
    }

    if (path === '/api/auth/logout' || path === '/auth/logout') {
      return await handleLogout(req);
    }

    // 404 for unknown paths
    return jsonResponse({ error: 'Not found' }, 404, req);
  } catch (error) {
    console.error('Auth error:', error);
    return jsonResponse({ error: error.message }, 500, req);
  }
}

/**
 * Handle login
 */
async function handleLogin(req) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  try {
    const body = await req.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return jsonResponse({ error: 'Username and password required' }, 400, req);
    }

    // Get user from database
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return jsonResponse({ error: 'Invalid credentials' }, 401, req);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return jsonResponse({ error: 'Invalid credentials' }, 401, req);
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      nama_lengkap: user.nama_lengkap,
    });

    // Return token and user info
    return jsonResponse({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
      },
    }, 200, req);
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ error: 'Login failed' }, 500, req);
  }
}

/**
 * Handle get current user (me)
 */
async function handleMe(req) {
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  try {
    // Verify token and get user data
    const userData = requireAuth(req);

    // Optionally fetch fresh user data from database
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne(
      { _id: { $oid: userData.id } },
      { projection: { password: 0 } }
    );

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404, req);
    }

    return jsonResponse({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
      },
    }, 200, req);
  } catch (error) {
    console.error('Me error:', error);
    return jsonResponse({ error: error.message }, 401, req);
  }
}

/**
 * Handle logout
 */
async function handleLogout(req) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  // JWT-based auth doesn't need server-side logout
  // Client just needs to delete the token
  return jsonResponse({
    success: true,
    message: 'Logged out successfully',
  }, 200, req);
}

/**
 * Helper to create JSON response with CORS headers
 */
function jsonResponse(data, status, req) {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  return addCorsHeaders(response, req);
}
