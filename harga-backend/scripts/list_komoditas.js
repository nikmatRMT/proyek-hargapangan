#!/usr/bin/env node
// scripts/list_komoditas.js
// List dokumen komoditas yang mengandung 'prim' atau 'beras' (case-insensitive)

import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || 'harga_pasar_dev';

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(MONGO_DB_NAME);
  const kom = db.collection('komoditas');

  const regex = { $regex: /(prim|beras)/i };
  const docs = await kom.find({ nama_komoditas: regex }).sort({ id: 1 }).toArray();
  console.log('Found', docs.length, 'documents matching /(prim|beras)/i');
  for (const d of docs) {
    console.log('---');
    console.log('ObjectId:', d._id?.toString?.() ?? d._id);
    console.log('id:', d.id);
    console.log('nama_komoditas:', d.nama_komoditas);
    console.log('unit:', d.unit);
    console.log('created_at:', d.created_at);
    console.log('updated_at:', d.updated_at);
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
