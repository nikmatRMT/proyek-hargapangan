// Check if market_id and komoditas_id in laporan_harga exist in pasar/komoditas collections
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-proyek-hargapangan:M6xSwPrwTctMFtLi@proyek-hargapangan.jcfbfhs.mongodb.net/?retryWrites=true&w=majority";
const dbName = 'harga_pasar_mongo';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);

    // Get the actual IDs from the first laporan_harga document
    const sampleDoc = await db.collection('laporan_harga').findOne({});
    const targetMarketId = sampleDoc?.market_id?.toString() || '68f346e987dbc73b8fee889e';
    const targetKomoditasId = sampleDoc?.komoditas_id?.toString() || '68f3472787dbc73b8fee88a5';

    // Check if these IDs exist in pasar and komoditas collections
    const { ObjectId } = require('mongodb');
    
    const market = await db.collection('pasar').findOne({ _id: new ObjectId(targetMarketId) });
    const komoditas = await db.collection('komoditas').findOne({ _id: new ObjectId(targetKomoditasId) });

    console.log('\n=== Checking specific IDs from laporan_harga ===');
    console.log('market_id:', targetMarketId);
    console.log('Market found:', market ? `Yes - ${market.nama_pasar || market.nama}` : 'NO - NOT FOUND');
    
    console.log('\nkomoditas_id:', targetKomoditasId);
    console.log('Komoditas found:', komoditas ? `Yes - ${komoditas.nama_komoditas || komoditas.nama}` : 'NO - NOT FOUND');

    // Count total documents
    const pasarCount = await db.collection('pasar').countDocuments();
    const komoditasCount = await db.collection('komoditas').countDocuments();
    const laporanCount = await db.collection('laporan_harga').countDocuments();

    console.log('\n=== Collection Counts ===');
    console.log('pasar:', pasarCount);
    console.log('komoditas:', komoditasCount);
    console.log('laporan_harga:', laporanCount);

    // Sample a few price documents to see their market_id/komoditas_id
    console.log('\n=== Sample 5 laporan_harga documents ===');
    const samples = await db.collection('laporan_harga').find({}).limit(5).toArray();
    for (const doc of samples) {
      const mid = doc.market_id?.toString() || 'N/A';
      const kid = doc.komoditas_id?.toString() || 'N/A';
      console.log(`Price: ${doc.harga}, market_id: ${mid}, komoditas_id: ${kid}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

main();
