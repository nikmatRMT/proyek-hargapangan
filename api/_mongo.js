const { MongoClient } = require('mongodb');

let _clientPromise = null;

async function getDb() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'harga_pasar_mongo';
  if (!uri) throw new Error('MONGODB_URI env is not set');

  if (!_clientPromise) {
    _clientPromise = (async () => {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
      await client.connect();
      return client.db(dbName);
    })();
  }
  return _clientPromise;
}

module.exports = getDb;

