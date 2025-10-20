// src/tools/db.js — MongoDB connection & helpers
import { MongoClient } from 'mongodb';

const ENV = process.env;
const MONGO_URI = ENV.MONGO_URI || ENV.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB_NAME = ENV.MONGO_DB_NAME || ENV.MONGODB_DB_NAME || ENV.DB_NAME || 'harga_pasar';

let client; // MongoClient singleton
let db;     // Db singleton

export const mongoUri = MONGO_URI;
export const mongoDbName = MONGO_DB_NAME;

export async function initMongo() {
  if (db) return db;
  client = new MongoClient(MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 0,
  });
  await client.connect();
  db = client.db(MONGO_DB_NAME);

  // Ensure collections & indexes
  const users = db.collection('users');
  const pasar = db.collection('pasar');
  const komoditas = db.collection('komoditas');
  const laporan_harga = db.collection('laporan_harga');
  const counters = db.collection('counters');

  await Promise.all([
    users.createIndex({ id: 1 }, { unique: true }).catch(() => {}),
    users.createIndex({ username: 1 }, { unique: true, sparse: true }).catch(() => {}),
    users.createIndex({ nip: 1 }, { unique: true, sparse: true }).catch(() => {}),

    pasar.createIndex({ id: 1 }, { unique: true }).catch(() => {}),
    pasar.createIndex({ nama_pasar: 1 }, { unique: true, sparse: true }).catch(() => {}),

    komoditas.createIndex({ id: 1 }, { unique: true }).catch(() => {}),
    komoditas.createIndex({ nama_komoditas: 1 }, { unique: true, sparse: true }).catch(() => {}),

    laporan_harga.createIndex({ id: 1 }, { unique: true, sparse: true }).catch(() => {}),
    laporan_harga.createIndex(
      { market_id: 1, komoditas_id: 1, tanggal_lapor: 1 },
      { unique: true }
    ).catch(() => {}),
    laporan_harga.createIndex({ market_id: 1, tanggal_lapor: 1 }).catch(() => {}),

    counters.createIndex({ _id: 1 }, { unique: true }).catch(() => {}),
  ]);

  return db;
}

export function getDb() {
  if (!db) throw new Error('MongoDB not initialized. Call initMongo() first.');
  return db;
}

export function collections() {
  const d = getDb();
  return {
    users: d.collection('users'),
    pasar: d.collection('pasar'),
    komoditas: d.collection('komoditas'),
    laporan_harga: d.collection('laporan_harga'),
    counters: d.collection('counters'),
  };
}

export async function getNextSeq(name) {
  const { counters } = collections();
  
  try {
    const res = await counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    
    const nextId = res.value?.seq || 1;
    console.log(`[getNextSeq] ${name}:`, { nextId, counterDoc: res.value });
    return nextId;
  } catch (error) {
    console.error(`[getNextSeq] Error for ${name}:`, error);
    
    // Fallback: get max id from collection
    const collectionName = name;
    const collection = getDb().collection(collectionName);
    const maxDoc = await collection.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    const maxId = maxDoc[0]?.id || 0;
    const nextId = maxId + 1;
    
    console.log(`[getNextSeq] Fallback for ${name}:`, { maxId, nextId });
    return nextId;
  }
}

export async function closeMongo() {
  try {
    await client?.close();
  } catch {}
  db = undefined;
  client = undefined;
}
