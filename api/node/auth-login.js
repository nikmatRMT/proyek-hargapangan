// api/node/auth-login.js
// Alias untuk /auth/login → redirect ke /api/node/login

export default async function handler(req, res) {
  // Forward request ke endpoint login yang sebenarnya
  const loginModule = await import('./login.js');
  return loginModule.default(req, res);
}
