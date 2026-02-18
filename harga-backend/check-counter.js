const { collections } = require('./src/tools/db.js');
const { initMongo } = require('./src/tools/db.js');

async function checkCounter() {
  try {
    await initMongo();
    const { counters } = collections();
    const counter = await counters.findOne({ _id: 'laporan_harga' });
    console.log('Current counter:', counter);
    
    // Cek ID 1177 sudah ada di laporan_harga
    const { laporan_harga } = collections();
    const existing1177 = await laporan_harga.findOne({ id: 1177 });
    console.log('ID 1177 exists:', existing1177);
    
    // Cek max ID saat ini
    const maxDoc = await laporan_harga.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    console.log('Current max ID:', maxDoc[0]?.id);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkCounter();
