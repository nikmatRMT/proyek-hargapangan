// Lightweight DB connectivity probe without Express/session
import mysql from 'mysql2/promise';

function readSsl() {
  const sslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';
  if (!sslEnabled) return undefined;
  const ca = process.env.DB_SSL_CA || (process.env.DB_SSL_CA_BASE64 ? Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8') : undefined);
  const ssl = { rejectUnauthorized: true, minVersion: 'TLSv1.2' };
  if (ca) ssl.ca = ca;
  return ssl;
}

export default async function handler(_req, res) {
  const cfg = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: readSsl(),
    connectTimeout: 8000,
  };
  let conn;
  try {
    const t0 = Date.now();
    conn = await mysql.createConnection(cfg);
    const [rows] = await conn.query('SELECT 1 AS ok');
    const ms = Date.now() - t0;
    res.status(200).json({ ok: true, rows, elapsed_ms: ms });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    try { await conn?.end(); } catch {}
  }
}

