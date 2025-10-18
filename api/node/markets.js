const getDb = require('../_mongo');

module.exports = async function handler(req, res) {
  try {
    const db = await getDb();
    const docs = await db.collection('pasar').find({}).sort({ nama_pasar: 1 }).toArray();
    const data = docs.map((d, i) => ({ id: i + 1, name: d.nama_pasar, nama: d.nama_pasar, nama_pasar: d.nama_pasar }));
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify({ data }));
  } catch (e) {
    res.status(500).end(JSON.stringify({ message: e?.message || String(e) }));
  }
};
