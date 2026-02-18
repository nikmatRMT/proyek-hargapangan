import { collections, initMongo } from './src/tools/db.js';

async function fixCounter() {
  try {
    await initMongo();
    const { counters, laporan_harga } = collections();
    
    // Get current max ID from laporan_harga collection
    const maxDoc = await laporan_harga.find({}).project({ id: 1 }).sort({ id: -1 }).limit(1).toArray();
    const maxId = maxDoc[0]?.id || 0;
    
    console.log('Current max ID in laporan_harga:', maxId);
    
    // Update counter to match max ID
    const result = await counters.updateOne(
      { _id: 'laporan_harga' },
      { $set: { seq: maxId } }
    );
    
    console.log('Counter update result:', result);
    console.log('Counter has been reset to:', maxId);
    
    // Verify the fix
    const counter = await counters.findOne({ _id: 'laporan_harga' });
    console.log('Updated counter:', counter);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixCounter();
