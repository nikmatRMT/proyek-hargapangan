// scripts/view-db.mjs - View database contents
import 'dotenv/config.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB_NAME || 'harga_pasar_dev';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  try {
    console.log(`\n📊 Database: ${dbName}\n`);
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));
    console.log('\n' + '='.repeat(80) + '\n');

    // Users
    const users = await db.collection('users').find({}).project({ password: 0 }).toArray();
    console.log('👤 USERS:', users.length);
    users.forEach(u => {
      console.log(`  - ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, Nama: ${u.nama_lengkap}`);
    });

    // Markets (Pasar)
    console.log('\n🏪 PASAR:', );
    const pasar = await db.collection('pasar').find({}).toArray();
    console.log('Total:', pasar.length);
    pasar.forEach(p => {
      console.log(`  - ID: ${p.id}, Nama: ${p.nama_pasar}`);
    });

    // Commodities (Komoditas)
    console.log('\n📦 KOMODITAS:');
    const komoditas = await db.collection('komoditas').find({}).toArray();
    console.log('Total:', komoditas.length);
    komoditas.slice(0, 10).forEach(k => {
      console.log(`  - ID: ${k.id}, Nama: ${k.nama_komoditas}`);
    });
    if (komoditas.length > 10) console.log(`  ... and ${komoditas.length - 10} more`);

    // Prices (Laporan Harga)
    console.log('\n💰 LAPORAN HARGA:');
    const prices = await db.collection('laporan_harga').find({}).sort({ id: -1 }).limit(5).toArray();
    console.log('Total:', await db.collection('laporan_harga').countDocuments());
    console.log('Latest 5:');
    prices.forEach(p => {
      console.log(`  - ID: ${p.id}, Market: ${p.market_id}, Commodity: ${p.komoditas_id}, Price: Rp ${p.harga.toLocaleString()}, Date: ${p.tanggal_lapor}`);
    });

    // Counters
    console.log('\n🔢 COUNTERS:');
    const counters = await db.collection('counters').find({}).toArray();
    counters.forEach(c => {
      console.log(`  - ${c._id}: ${c.seq}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');
  } finally {
    await client.close();
  }
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
