// Test MongoDB connection
import 'dotenv/config.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = (process.env.MONGO_DB_NAME || 'harga_pasar').trim();

console.log('Testing MongoDB connection...');
console.log('URI:', uri.replace(/:[^:@]+@/, ':***@')); // Hide password
console.log('Database:', dbName);
console.log('');

async function main() {
  const client = new MongoClient(uri);
  
  try {
    console.log('⏳ Connecting...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📊 Database: ${dbName}`);
    console.log(`📁 Collections (${collections.length}):`);
    collections.forEach(c => console.log(`   - ${c.name}`));
    
    // Count documents in users collection
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    console.log(`\n👤 Users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  No users found! Run: node scripts/seed-users.mjs');
    }
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Possible causes:');
      console.error('   - Network/Internet connection issue');
      console.error('   - MongoDB Atlas cluster paused');
      console.error('   - DNS resolution problem');
    }
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Check your MongoDB credentials in .env');
    }
    
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed.');
  }
}

main().catch(console.error);
