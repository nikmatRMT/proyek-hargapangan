// scripts/clean-local-dbs.mjs
// Clean up duplicate local databases
import { MongoClient } from 'mongodb';

const LOCAL_URI = 'mongodb://127.0.0.1:27017';

async function main() {
  console.log('🧹 Cleaning up local databases...\n');
  
  const client = new MongoClient(LOCAL_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to local MongoDB\n');
    
    // List all databases
    const adminDb = client.db('admin');
    const dbList = await adminDb.admin().listDatabases();
    
    console.log('📊 Current databases:');
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Databases to clean (excluding system databases)
    const toClean = ['harga_pasar', 'harga_pasar_dev'];
    const systemDbs = ['admin', 'config', 'local'];
    
    console.log('\n🗑️  Databases to drop:');
    for (const dbName of toClean) {
      const exists = dbList.databases.find(db => db.name === dbName);
      if (exists && !systemDbs.includes(dbName)) {
        console.log(`   - ${dbName}`);
      }
    }
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will delete the databases listed above from LOCAL MongoDB.');
    console.log('⚠️  Production database (online) will NOT be affected.');
    console.log('\nTo proceed, run with --confirm flag:');
    console.log('   node scripts/clean-local-dbs.mjs --confirm\n');
    
    // Check if --confirm flag is present
    if (!process.argv.includes('--confirm')) {
      console.log('❌ Cancelled. Use --confirm to proceed.\n');
      return;
    }
    
    console.log('\n🔄 Dropping databases...\n');
    
    for (const dbName of toClean) {
      const exists = dbList.databases.find(db => db.name === dbName);
      if (exists && !systemDbs.includes(dbName)) {
        await client.db(dbName).dropDatabase();
        console.log(`   ✅ Dropped: ${dbName}`);
      }
    }
    
    console.log('\n✅ Clean up completed!\n');
    
    // Show remaining databases
    const afterList = await adminDb.admin().listDatabases();
    console.log('📊 Remaining databases:');
    afterList.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
