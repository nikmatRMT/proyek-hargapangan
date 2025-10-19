// scripts/seed-users.mjs
import 'dotenv/config.js';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = (process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'harga_pasar').trim();

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  try {
    const users = db.collection('users');
    const now = new Date();

    // Ensure indexes (defensive)
    await Promise.all([
      users.createIndex({ id: 1 }, { unique: true }).catch(() => {}),
      users.createIndex({ username: 1 }, { unique: true, sparse: true }).catch(() => {}),
      users.createIndex({ nip: 1 }, { unique: true, sparse: true }).catch(() => {}),
    ]);

    // Compute next id from max(id)
    const maxDoc = await users.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    let nextId = (maxDoc[0]?.id || 0) + 1;

    let inserted = 0, skipped = 0;

    // Seed default admin
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existsAdmin = await users.findOne({ username: adminUsername });
    if (existsAdmin) {
      skipped++;
    } else {
      const hash = await bcrypt.hash(String(adminPassword), 10);
      await users.insertOne({
        id: nextId++,
        username: adminUsername,
        password: hash,
        role: 'admin',
        is_active: true,
        nama_lengkap: 'Administrator',
        created_at: now,
        updated_at: now,
      });
      inserted++;
    }

    // Optionally seed a sample petugas
    const petugasUser = process.env.PETUGAS_USERNAME || 'petugas1';
    const petugasPass = process.env.PETUGAS_PASSWORD || 'petugas123';
    const petugasNip  = process.env.PETUGAS_NIP || '990001';
    const existsPet = await users.findOne({ $or: [{ username: petugasUser }, { nip: petugasNip }] });
    if (existsPet) {
      skipped++;
    } else {
      const hash = await bcrypt.hash(String(petugasPass), 10);
      await users.insertOne({
        id: nextId++,
        username: petugasUser,
        password: hash,
        role: 'petugas',
        is_active: true,
        nama_lengkap: 'Petugas Harga',
        nip: petugasNip,
        created_at: now,
        updated_at: now,
      });
      inserted++;
    }

    console.log(`Seed users done. Inserted=${inserted}, skipped=${skipped}`);
  } finally {
    await client.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
