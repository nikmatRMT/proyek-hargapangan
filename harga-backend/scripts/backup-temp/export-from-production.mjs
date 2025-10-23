// scripts/export-from-production.mjs
// Export data from production MongoDB Atlas to local JSON files
import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';

// PRODUCTION connection string (dari .env atau hardcode sementara)
const PROD_URI = 'mongodb+srv://Vercel-Admin-proyek-hargapangan:M6xSwPrwTctMFtLi@proyek-hargapangan.jcfbfhs.mongodb.net/?retryWrites=true&w=majority';
const PROD_DB_NAME = 'harga_pasar';

const EXPORT_DIR = './data/export';

async function exportCollection(db, collectionName) {
  console.log(`\n📦 Exporting ${collectionName}...`);
  const collection = db.collection(collectionName);
  const docs = await collection.find({}).toArray();
  
  const exportPath = path.join(EXPORT_DIR, `${collectionName}.json`);
  await fs.writeFile(exportPath, JSON.stringify(docs, null, 2), 'utf-8');
  
  console.log(`   ✅ Exported ${docs.length} documents to ${exportPath}`);
  return docs.length;
}

async function main() {
  console.log('🔄 Starting export from PRODUCTION database...\n');
  console.log(`Source: ${PROD_DB_NAME} (MongoDB Atlas)`);
  console.log(`Target: ${EXPORT_DIR}\n`);
  
  // Create export directory
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  
  const client = new MongoClient(PROD_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to production database\n');
    
    const db = client.db(PROD_DB_NAME);
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`Found ${collectionNames.length} collections:`, collectionNames.join(', '));
    
    let totalDocs = 0;
    
    // Export each collection
    for (const collName of collectionNames) {
      const count = await exportCollection(db, collName);
      totalDocs += count;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Export completed! Total documents: ${totalDocs}`);
    console.log(`📁 Files saved to: ${EXPORT_DIR}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
