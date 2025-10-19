// scripts/seed-prices.mjs
import 'dotenv/config.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = (process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'harga_pasar').trim();

function dateISO(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  try {
    const prices = db.collection('laporan_harga');
    const pasar = db.collection('pasar');
    const komoditas = db.collection('komoditas');
    const users = db.collection('users');

    // Build next id from max(id)
    const maxDoc = await prices.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    let nextId = (maxDoc[0]?.id || 0) + 1;

    // Pick one market, one user, and a few commodities
    const p = await pasar.findOne({}, { projection: { id: 1, nama_pasar: 1 } });
    if (!p) { console.log('No pasar found. Seed pasar first.'); return; }
    const u = await users.findOne({ role: 'petugas', is_active: true }, { projection: { id: 1 } })
           || await users.findOne({ role: 'admin', is_active: true }, { projection: { id: 1 } });
    if (!u) { console.log('No user found. Seed users first.'); return; }

    const kList = await komoditas.find({}).project({ id: 1, nama_komoditas: 1 }).sort({ id: 1 }).limit(3).toArray();
    if (!kList?.length) { console.log('No komoditas found. Seed commodities first.'); return; }

    const base = 16000;
    const year = 2024, month = 8; // August 2024, like your sample
    const days = [1, 2, 3, 4, 5];
    let inserted = 0, skipped = 0;
    for (const d of days) {
      const tanggal = dateISO(year, month, d);
      for (let i = 0; i < kList.length; i++) {
        const k = kList[i];
        const unique = { market_id: p.id, komoditas_id: k.id, tanggal_lapor: tanggal };
        const exist = await prices.findOne(unique, { projection: { id: 1 } });
        if (exist) { skipped++; continue; }
        await prices.insertOne({
          id: nextId++,
          ...unique,
          harga: base + i * 200 + d * 10,
          status: 'verified',
          user_id: u.id,
          created_at: new Date(),
          updated_at: new Date(),
          foto_url: null,
          gps_url: null,
          latitude: null,
          longitude: null,
          keterangan: null,
        });
        inserted++;
      }
    }
    console.log(`Seed prices done. Inserted=${inserted}, skipped=${skipped} (market ${p.nama_pasar})`);
  } finally {
    await client.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
