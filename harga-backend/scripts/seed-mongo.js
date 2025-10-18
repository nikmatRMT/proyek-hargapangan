#!/usr/bin/env node
// Seed MongoDB: buat admin, pasar, komoditas dasar, dan pastikan index terpasang
import 'dotenv/config.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import Market from '../src/models/Market.js';
import Commodity from '../src/models/Commodity.js';
import User from '../src/models/User.js';
import Report from '../src/models/Report.js';

async function connect() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME || 'harga_pasar_mongo';
  if (!uri) throw new Error('MONGO_URI tidak diset');
  await mongoose.connect(uri, { dbName });
}

async function ensureIndexes() {
  await Promise.all([
    Market.init(),
    Commodity.init(),
    User.init(),
    Report.init(),
  ]);
}

async function upsertAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  const name = process.env.SEED_ADMIN_NAME || 'Administrator';
  if (!password || password.length < 6) {
    console.log('Lewati admin (SEED_ADMIN_PASSWORD kosong atau < 6).');
    return;
  }
  const exist = await User.findOne({ username }).lean();
  if (exist) {
    console.log('Admin sudah ada:', username);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const doc = await User.create({
    nip: null,
    nama_lengkap: name,
    username,
    password: hash,
    role: 'admin',
    is_active: true,
  });
  console.log('Admin dibuat:', { id: String(doc._id), username });
}

async function seedReferenceData() {
  const markets = [
    'Pasar Induk',
    'Pasar Baru',
    'Pasar Selatan',
  ];
  const commodities = [
    { nama_komoditas: 'Beras Premium', unit: '(Rp/Kg)' },
    { nama_komoditas: 'Cabai Merah', unit: '(Rp/Kg)' },
    { nama_komoditas: 'Telur Ayam', unit: '(Rp/Kg)' },
  ];

  if ((await Market.estimatedDocumentCount()) === 0) {
    await Market.insertMany(markets.map(n => ({ nama_pasar: n })));
    console.log('Seed markets OK');
  } else {
    console.log('Markets sudah ada, lewati');
  }

  if ((await Commodity.estimatedDocumentCount()) === 0) {
    await Commodity.insertMany(commodities);
    console.log('Seed commodities OK');
  } else {
    console.log('Commodities sudah ada, lewati');
  }
}

async function main() {
  await connect();
  await ensureIndexes();
  await upsertAdmin();
  await seedReferenceData();
}

main()
  .then(() => mongoose.disconnect())
  .catch((e) => {
    console.error('Seed gagal:', e?.message || e);
    process.exit(1);
  });

