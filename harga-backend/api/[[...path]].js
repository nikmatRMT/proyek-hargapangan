// Catch-all API route for Vercel so every /api/* request
// is handled by our single Express app.
import serverless from 'serverless-http';
import app from '../src/server.js';

export default serverless(app);

