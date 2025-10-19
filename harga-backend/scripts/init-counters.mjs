// scripts/init-counters.mjs
// Set counters collection seq values to current max(id) for each collection
import 'dotenv/config.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = (process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'harga_pasar').trim();

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  try {
    const collections = ['users', 'laporan_harga', 'pasar', 'komoditas'];
    for (const name of collections) {
      const agg = [
        { $match: { id: { $exists: true } } },
        { $project: { idNum: { $convert: { input: '$id', to: 'long', onError: 0, onNull: 0 } } } },
        { $sort: { idNum: -1 } },
        { $limit: 1 },
      ];
      const maxAgg = await db.collection(name).aggregate(agg).toArray();
      const maxId = maxAgg[0]?.idNum || 0;
      await db.collection('counters').updateOne(
        { _id: name },
        { $set: { seq: maxId } },
        { upsert: true }
      );
      console.log(`counter ${name} set to ${maxId}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
