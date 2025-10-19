// scripts/seed-pasar.mjs
import 'dotenv/config.js';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = (process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'harga_pasar').trim();

function titleCase(s) {
  return String(s)
    .split(/\s+/)
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}

function marketNameFromFilename(fname) {
  // e.g., "pasar-bauntung-2024.xlsx" -> "Pasar Bauntung"
  const base = path.basename(fname).toLowerCase();
  if (!base.startsWith('pasar-')) return null;
  const noExt = base.replace(/\.xlsx$/i, '');
  const parts = noExt.split('-');
  // remove leading 'pasar'
  parts.shift();
  // remove trailing year if present
  if (/^\d{4}$/.test(parts[parts.length - 1])) parts.pop();
  const name = titleCase(parts.join(' ').replace(/\s+/g, ' ').trim());
  return name ? `Pasar ${name.replace(/^Pasar\s+/i, '')}` : null;
}

async function getNextSeq(db, name) {
  const res = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return res.value?.seq || 1;
}

async function main() {
  const dataDir = path.resolve('data');
  const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [];
  const xlxs = files.filter(f => /^pasar-.*\.xlsx$/i.test(f));
  const names = Array.from(new Set(xlxs.map(marketNameFromFilename).filter(Boolean)));

  if (!names.length) {
    console.log('No pasar-*.xlsx files found in data/. Nothing to seed.');
    return;
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  try {
    const col = db.collection('pasar');
    const maxDoc = await col.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    let nextId = (maxDoc[0]?.id || 0) + 1;
    let inserted = 0, skipped = 0;
    for (const nama of names) {
      const exists = await col.findOne({ nama_pasar: nama });
      if (exists) { skipped++; continue; }
      const id = nextId++;
      await col.insertOne({ id, nama_pasar: nama, created_at: new Date(), updated_at: new Date() });
      inserted++;
    }
    console.log(`Seed pasar done. Inserted=${inserted}, skipped=${skipped}`);
  } finally {
    await client.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
