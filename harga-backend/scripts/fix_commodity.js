#!/usr/bin/env node
// scripts/fix_commodity.js
// Perbaiki dokumen komoditas yang mengandung kata 'primium' menjadi 'Beras Premium'
// Menambahkan field unit, created_at, updated_at, dan id numerik jika belum ada.

import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || 'harga_pasar_dev';

async function getNextId(collection) {
  // Cari max id dan tambah 1
  const maxDoc = await collection.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
  const maxId = maxDoc[0]?.id ?? 0;
  return maxId + 1;
}

async function main() {
  console.log('[fix_commodity] Connecting to', MONGO_URI, 'db:', MONGO_DB_NAME);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(MONGO_DB_NAME);
  const kom = db.collection('komoditas');

  // Cari dokumen yang mengandung 'primium' (case-insensitive)
  const cursor = kom.find({ nama_komoditas: { $regex: /primium/i } });
  const docs = await cursor.toArray();

  if (!docs.length) {
    console.log('[fix_commodity] Tidak menemukan dokumen matching \'primium\'.');
    await client.close();
    return;
  }

  console.log('[fix_commodity] Ditemukan', docs.length, 'dokumen.');
  const now = new Date();

  for (const doc of docs) {
    console.log('\n-- Memproses _id=', doc._id, 'current nama_komoditas=', doc.nama_komoditas, 'id=', doc.id);

    const update = { $set: { nama_komoditas: 'Beras Premium', unit: '(Rp/Kg)', updated_at: now } };

    // if created_at missing, set it to now
    if (!doc.created_at) update.$set.created_at = now;

    // if id missing or not a finite number, generate next id
    if (!(typeof doc.id === 'number' && Number.isFinite(doc.id) && doc.id > 0)) {
      const nextId = await getNextId(kom);
      update.$set.id = nextId;
      console.log('[fix_commodity] Menetapkan id baru =', nextId);
    }

    const res = await kom.updateOne({ _id: doc._id }, update);
    console.log('[fix_commodity] updateOne result:', { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount });
  }

  console.log('\n[fix_commodity] Selesai. Tutup koneksi.');
  await client.close();
}

main().catch((err) => {
  console.error('[fix_commodity] Error:', err);
  process.exit(1);
});
