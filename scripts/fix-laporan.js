// Fix laporan_harga data with correct IDs
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-proyek-hargapangan:M6xSwPrwTctMFtLi@proyek-hargapangan.jcfbfhs.mongodb.net/?retryWrites=true&w=majority";
const dbName = 'harga_pasar_mongo';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection('laporan_harga');

    // Old incorrect IDs
    const oldMarketId = new ObjectId('68f346e987dbc73b8fee889e');
    const oldKomoditasId = new ObjectId('68f3472787dbc73b8fee88a5');
    
    // New correct IDs
    const newMarketId = new ObjectId('68f3801dc2a3551aa00bd1a4'); // Pasar Bauntung
    const newKomoditasId = new ObjectId('68f3801dc2a3551aa00bd1a8'); // Beras
    const newHarga = 16400;

    console.log('\n=== Before Update ===');
    const before = await collection.findOne({
      market_id: oldMarketId,
      komoditas_id: oldKomoditasId
    });
    if (before) {
      console.log(`Found document:`);
      console.log(`  - Harga: Rp ${before.harga}`);
      console.log(`  - market_id: ${before.market_id} (INCORRECT)`);
      console.log(`  - komoditas_id: ${before.komoditas_id} (INCORRECT)`);
    } else {
      console.log('Document not found with old IDs');
    }

    console.log('\n=== Updating ===');
    const result = await collection.updateOne(
      {
        market_id: oldMarketId,
        komoditas_id: oldKomoditasId
      },
      {
        $set: {
          market_id: newMarketId,
          komoditas_id: newKomoditasId,
          harga: newHarga
        }
      }
    );

    console.log(`Matched: ${result.matchedCount} document(s)`);
    console.log(`Modified: ${result.modifiedCount} document(s)`);

    console.log('\n=== After Update ===');
    const after = await collection.findOne({
      market_id: newMarketId,
      komoditas_id: newKomoditasId
    });
    if (after) {
      console.log(`Updated document:`);
      console.log(`  - Harga: Rp ${after.harga}`);
      console.log(`  - market_id: ${after.market_id} (Pasar Bauntung) ✓`);
      console.log(`  - komoditas_id: ${after.komoditas_id} (Beras) ✓`);
    }

    console.log('\n✅ Update complete!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

main();
