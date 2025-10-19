// List all pasar and komoditas to help identify correct mapping
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-proyek-hargapangan:M6xSwPrwTctMFtLi@proyek-hargapangan.jcfbfhs.mongodb.net/?retryWrites=true&w=majority";
const dbName = 'harga_pasar_mongo';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('=== All Pasar (Markets) ===');
    const pasars = await db.collection('pasar').find({}).toArray();
    pasars.forEach((p, i) => {
      console.log(`${i+1}. ${p.nama_pasar || p.nama} (ID: ${p._id})`);
    });

    console.log('\n=== All Komoditas (Commodities) ===');
    const komods = await db.collection('komoditas').find({}).toArray();
    komods.forEach((k, i) => {
      console.log(`${i+1}. ${k.nama_komoditas || k.nama} - ${k.unit || 'kg'} (ID: ${k._id})`);
    });

    console.log('\n=== Current laporan_harga document ===');
    const laporan = await db.collection('laporan_harga').findOne({});
    console.log(`Price: Rp ${laporan.harga}`);
    console.log(`Date: ${laporan.tanggal_lapor}`);
    console.log(`Current market_id: ${laporan.market_id} (NOT FOUND)`);
    console.log(`Current komoditas_id: ${laporan.komoditas_id} (NOT FOUND)`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

main();
