// api/index.js
import serverless from 'serverless-http';
import app from '../src/server.js';

export const config = {
  runtime: 'nodejs22.x',
};

// Jangan tunggu event loop kosong (pool MySQL dll.) di serverless
export default serverless(app, { callbackWaitsForEmptyEventLoop: false });
