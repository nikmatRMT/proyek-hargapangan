// scripts/seed-commodities.mjs
import 'dotenv/config.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = (process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'harga_pasar').trim();

const commodityOrder = [
  'Beras',
  'Minyak Goreng Kemasan',
  'Minyak Goreng Curah',
  'Tepung Terigu Kemasan',
  'Tepung Terigu Curah',
  'Gula Pasir',
  'Telur Ayam',
  'Daging Sapi',
  'Daging Ayam',
  'Kedelai',
  'Bawang Merah',
  'Bawang Putih',
  'Cabe Merah Besar',
  'Cabe Rawit',
  'Ikan Haruan/ Gabus',
  'Ikan Tongkol/Tuna',
  'Ikan Mas/Nila',
  'Ikan Patin',
  'Ikan Papuyu/Betok',
  'Ikan Bandeng',
  'Ikan Kembung/Pindang',
];

const unitsMap = Object.fromEntries(commodityOrder.map((nm) => [nm, '(Rp/Kg)']));
unitsMap['Minyak Goreng Kemasan'] = '(Rp/Liter)';
unitsMap['Minyak Goreng Curah']   = '(Rp/Liter)';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  try {
    const col = db.collection('komoditas');
    const maxDoc = await col.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    let nextId = (maxDoc[0]?.id || 0) + 1;
    let inserted = 0, skipped = 0;
    for (const nama of commodityOrder) {
      const exists = await col.findOne({ nama_komoditas: nama });
      if (exists) { skipped++; continue; }
      const id = nextId++;
      await col.insertOne({ id, nama_komoditas: nama, unit: unitsMap[nama], created_at: new Date(), updated_at: new Date() });
      inserted++;
    }
    console.log(`Seed komoditas done. Inserted=${inserted}, skipped=${skipped}`);
  } finally {
    await client.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
