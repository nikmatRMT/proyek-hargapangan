// api/node/auth-me.js
// Alias untuk /auth/me → redirect ke /api/node/me

export default async function handler(req, res) {
  // Forward request ke endpoint me yang sebenarnya
  const meModule = await import('./me.js');
  return meModule.default(req, res);
}
