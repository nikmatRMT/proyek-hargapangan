import { getDB } from './utils/mongo.js';
import { handleCors, addCorsHeaders } from './utils/cors.js';

/**
 * Test endpoint to verify environment variables and MongoDB connection
 */
export default async function handler(req) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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

    const response = new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    return addCorsHeaders(response, req);
  } catch (error) {
    const response = new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    return addCorsHeaders(response, req);
  }
}
