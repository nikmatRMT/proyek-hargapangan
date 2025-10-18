const getDb = require('./_mongo');

module.exports = async function handler(req, res) {
  try {
    const db = await getDb();
    const total = await db.collection('laporan_harga').countDocuments();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify({ status: 'ok', source: 'mongo', rows: total }));
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify({ status: 'ok', source: 'mongo', rows: null, note: err?.message || String(err) }));
  }
};

