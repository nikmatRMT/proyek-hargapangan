// Check if admin user exists
import 'dotenv/config.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = (process.env.MONGO_DB_NAME || 'harga_pasar').trim();

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  
  try {
    const users = db.collection('users');
    const adminUser = await users.findOne({ username: 'admin' });
    
    if (adminUser) {
      console.log('✅ Admin user EXISTS:');
      console.log({
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
        is_active: adminUser.is_active,
        nama_lengkap: adminUser.nama_lengkap
      });
    } else {
      console.log('❌ Admin user NOT FOUND!');
      console.log('Run: node scripts/seed-users.mjs');
    }
    
    const totalUsers = await users.countDocuments();
    console.log(`\nTotal users in database: ${totalUsers}`);
    
  } finally {
    await client.close();
  }
}

main().catch(console.error);
