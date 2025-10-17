#!/usr/bin/env node
// Create an admin user via CLI: hashes password and inserts into DB
// Usage examples:
//   node scripts/create-admin.js --username admin --password "PasswordKuat123!" --name "Administrator" --nip 0001
//   NODE_OPTIONS= node scripts/create-admin.js -u admin -p Pass123! -n Admin

import 'dotenv/config.js';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-u' || a === '--username') out.username = argv[++i];
    else if (a === '-p' || a === '--password') out.password = argv[++i];
    else if (a === '-n' || a === '--name') out.name = argv[++i];
    else if (a === '--nip') out.nip = argv[++i];
    else if (a === '--role') out.role = argv[++i];
  }
  return out;
}

function readSsl() {
  const enabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';
  if (!enabled) return undefined;
  const ca = process.env.DB_SSL_CA || (process.env.DB_SSL_CA_BASE64 ? Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8') : undefined);
  const ssl = { rejectUnauthorized: true, minVersion: 'TLSv1.2' };
  if (ca) ssl.ca = ca;
  return ssl;
}

async function main() {
  const args = parseArgs(process.argv);
  const username = args.username || process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = args.password || process.env.SEED_ADMIN_PASSWORD || '';
  const name = args.name || process.env.SEED_ADMIN_NAME || 'Administrator';
  const nip = args.nip || null;
  const role = (args.role || 'admin').toLowerCase() === 'admin' ? 'admin' : 'petugas';

  if (!password || password.length < 6) {
    console.error('Password wajib diisi dan minimal 6 karakter.');
    process.exit(1);
  }

  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'harga_pasar',
    ssl: readSsl(),
    connectTimeout: 10000,
  };

  const conn = await mysql.createConnection(cfg);
  try {
    const [dupU] = await conn.query('SELECT id FROM users WHERE username=? LIMIT 1', [username]);
    if (dupU && dupU.length) {
      console.log(`Username "${username}" sudah ada (id=${dupU[0].id}).`);
      process.exit(0);
    }
    const hash = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (nip, nama_lengkap, username, password, role, is_active, phone, alamat, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 1, NULL, NULL, NOW(), NOW())`;
    const [res] = await conn.query(sql, [nip, name, username, hash, role]);
    console.log('Admin dibuat:', { id: res.insertId, username, role });
  } finally {
    try { await conn.end(); } catch {}
  }
}

main().catch((e) => {
  console.error('Gagal membuat admin:', e?.message || e);
  process.exit(1);
});

