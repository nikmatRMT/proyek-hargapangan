import { collections, initMongo } from './src/tools/db.js';

async function checkCounter() {
  try {
    await initMongo();
    const { counters } = collections();
    const counter = await counters.findOne({ _id: 'laporan_harga' });
    console.log('Current counter:', counter);
    
    // Cek max ID saat ini
    const { laporan_harga } = collections();
    const maxDoc = await laporan_harga.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    console.log('Current max ID:', maxDoc[0]?.id);
    
    // Cek ID 1245 sudah ada
    const existing1245 = await laporan_harga.findOne({ id: 1245 });
    console.log('ID 1245 exists:', existing1245);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkCounter();
