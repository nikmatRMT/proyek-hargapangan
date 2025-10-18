#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI || process.argv[2];
  if (!uri) {
    console.error('Usage: MONGODB_URI="..." node scripts/list-mongo.js');
    process.exit(1);
  }
  const dbName = process.env.MONGODB_DB || 'harga_pasar_mongo';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    const cols = await db.listCollections().toArray();
    console.log('Collections:');
    for (const c of cols) {
      console.log('-', c.name);
      const docs = await db.collection(c.name).find({}).limit(5).toArray();
      console.log('  Example docs:', docs.slice(0,5));
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(2);
  } finally {
    await client.close();
  }
}

run();
