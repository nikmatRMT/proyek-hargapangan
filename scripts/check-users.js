// Check users in MongoDB
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-proyek-hargapangan:M6xSwPrwTctMFtLi@proyek-hargapangan.jcfbfhs.mongodb.net/?retryWrites=true&w=majority";
const dbName = 'harga_pasar_mongo';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = await db.collection('users').find({}).toArray();
    
    console.log('\n=== Users in database ===');
    users.forEach((u, i) => {
      console.log(`\n${i+1}. User ID: ${u._id}`);
      console.log(`   Username: ${u.username || u.email || 'N/A'}`);
      console.log(`   Email: ${u.email || 'N/A'}`);
      console.log(`   Role: ${u.role || 'N/A'}`);
      console.log(`   Password (hashed): ${u.password ? (u.password.substring(0, 20) + '...') : 'N/A'}`);
      console.log(`   Fields: ${Object.keys(u).join(', ')}`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

main();
