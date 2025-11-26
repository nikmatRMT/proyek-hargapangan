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
    // audit logs collection
    db.collection('audit_logs').createIndex({ id: 1 }, { unique: true }).catch(() => {}),
    db.collection('audit_logs').createIndex({ collection: 1 }).catch(() => {}),
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
  // Gunakan atomic counter untuk menghindari race condition
  const { counters } = collections();
  
  console.log(`[getNextSeq] Getting next ID for: ${name}`);
  
  try {
    // Atomic increment using findOneAndUpdate
    const result = await counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { 
        upsert: true,
        returnDocument: 'after',
        projection: { seq: 1 }
      }
    );
    
    // MongoDB driver bisa mengembalikan doc langsung atau di property value
    const doc = result?.value ?? result;
    let nextId = doc?.seq;

    // Jika seq tidak valid, fallback paksa
    if (!Number.isFinite(nextId)) {
      throw new Error(`Invalid counter value for ${name}: ${JSON.stringify(doc)}`);
    }

    // Safety: jika counter tertinggal dari data aktual, loncat ke max+1
    const collection = getDb().collection(name);
    const maxDoc = await collection.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    const maxId = maxDoc[0]?.id ?? 0;
    if (nextId <= maxId) {
      nextId = maxId + 1;
      await counters.updateOne({ _id: name }, { $set: { seq: nextId } }, { upsert: true });
      console.warn(`[getNextSeq] Counter for ${name} was behind. Bumped to ${nextId} (max was ${maxId})`);
    }

    console.log(`[getNextSeq] ${name}:`, { nextId });
    return nextId;
  } catch (err) {
    console.error(`[getNextSeq] Error for ${name}:`, err);
    // Fallback ke cara lama jika atomic counter gagal
    const collectionName = name;
    const collection = getDb().collection(collectionName);
    
    console.log(`[getNextSeq] Fallback: Getting max ID from collection: ${collectionName}`);
    
    const maxDoc = await collection.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    const maxId = maxDoc[0]?.id || 0;
    const nextId = maxId + 1;
    
    // Pastikan counter ikut dilompatkan supaya percobaan berikutnya aman
    try { await counters.updateOne({ _id: name }, { $set: { seq: nextId } }, { upsert: true }); } catch (_) {}
    
    console.log(`[getNextSeq] ${name} fallback:`, { maxId, nextId, hasDoc: !!maxDoc[0] });
    return nextId;
  }
}

/**
 * Log an audit entry to `audit_logs` collection.
 * Expects user to be a small object (id, username, role) if available.
 */
export async function logAudit({ collectionName, documentId = null, action, user = null, before = null, after = null, note = null }) {
  const id = await getNextSeq('audit_logs');
  const audit = {
    id,
    collection: collectionName,
    documentId,
    action,
    user: user ? { id: user.id ?? user._id ?? null, username: user.username ?? user.name ?? null, role: user.role ?? null } : null,
    before: before || null,
    after: after || null,
    note: note || null,
    created_at: new Date(),
  };
  try {
    const { audit_logs } = collections();
    await audit_logs.insertOne(audit);
  } catch (err) {
    // Don't fail main operation if audit logging fails; just emit a console warning.
    console.warn('[logAudit] failed to write audit entry:', err?.message || err);
  }
  return audit;
}

export async function closeMongo() {
  try {
    await client?.close();
  } catch {}
  db = undefined;
  client = undefined;
}
