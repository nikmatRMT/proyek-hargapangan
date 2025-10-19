import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

/**
 * Connect to MongoDB and cache the connection
 * @returns {Promise<MongoClient>}
 */
export async function connectDB() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'harga_pasar_mongo';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(dbName);

    cachedClient = client;
    cachedDb = db;

    console.log('✅ Connected to MongoDB:', dbName);
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

/**
 * Get database instance
 * @returns {Promise<Db>}
 */
export async function getDB() {
  const { db } = await connectDB();
  return db;
}

/**
 * Get collection from database
 * @param {string} collectionName 
 * @returns {Promise<Collection>}
 */
export async function getCollection(collectionName) {
  const db = await getDB();
  return db.collection(collectionName);
}
