// Catch-all for any /api/* request and forward to Express app
import serverless from 'serverless-http';
import app from '../src/server.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default serverless(app);

