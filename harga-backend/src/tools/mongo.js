import mongoose from 'mongoose';

let ready = null;

export function isMongo() {
  return String(process.env.DATA_BACKEND || '').toLowerCase() === 'mongo' || !!process.env.MONGO_URI;
}

export async function connectMongo() {
  if (!isMongo()) return null;
  if (ready) return ready;
  const uri = process.env.MONGO_URI;
  const db = process.env.MONGO_DB_NAME || 'harga_pasar_mongo';
  ready = mongoose.connect(uri, { dbName: db });
  return ready;
}

