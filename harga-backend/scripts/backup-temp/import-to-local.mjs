// scripts/import-to-local.mjs
// Import exported JSON files to local MongoDB
import 'dotenv/config.js';
import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';

const LOCAL_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const LOCAL_DB_NAME = process.env.MONGO_DB_NAME || 'harga_pasar_dev';
const IMPORT_DIR = './data/export';

async function importCollection(db, collectionName, filePath) {
  console.log(`\n📦 Importing ${collectionName}...`);
  
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const docs = JSON.parse(fileContent);
  
  if (docs.length === 0) {
    console.log(`   ⚠️  No documents to import`);
    return 0;
  }
  
  const collection = db.collection(collectionName);
  
  // Clear existing data (optional - comment out if you want to keep existing)
  const deleteResult = await collection.deleteMany({});
  console.log(`   🗑️  Deleted ${deleteResult.deletedCount} existing documents`);
  
  // Insert new data
  const result = await collection.insertMany(docs);
  console.log(`   ✅ Imported ${result.insertedCount} documents`);
  
  return result.insertedCount;
}

async function main() {
  console.log('🔄 Starting import to LOCAL database...\n');
  console.log(`Source: ${IMPORT_DIR}`);
  console.log(`Target: ${LOCAL_DB_NAME} (${LOCAL_URI})\n`);
  
  const client = new MongoClient(LOCAL_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to local database\n');
    
    const db = client.db(LOCAL_DB_NAME);
    
    // Read all JSON files from export directory
    const files = await fs.readdir(IMPORT_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} export files:`, jsonFiles.join(', '));
    
    let totalDocs = 0;
    
    // Import each collection
    for (const file of jsonFiles) {
      const collectionName = path.basename(file, '.json');
      const filePath = path.join(IMPORT_DIR, file);
      const count = await importCollection(db, collectionName, filePath);
      totalDocs += count;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Import completed! Total documents: ${totalDocs}`);
    console.log(`📊 Database: ${LOCAL_DB_NAME}`);
    console.log('='.repeat(80) + '\n');
    
    // Show summary
    console.log('📋 Collection summary:');
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`   - ${coll.name}: ${count} documents`);
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
