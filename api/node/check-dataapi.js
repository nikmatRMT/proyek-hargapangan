const getDb = require('./_mongo');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    // Prefer native Node driver if MONGODB_URI exists
    if (process.env.MONGODB_URI) {
      const db = await getDb();
      const markets = await db.collection('pasar').find({}, { projection: { nama_pasar: 1 } }).limit(5).toArray();
      const comms = await db.collection('komoditas').find({}, { projection: { nama_komoditas: 1, unit: 1 } }).limit(5).toArray();
      const prices = await db.collection('laporan_harga').find({}).sort({ tanggal_lapor: -1 }).limit(5).toArray();
      return res.status(200).send(JSON.stringify({ method: 'native', samples: { markets, commodities: comms, prices_raw: prices } }));
    }

    // Fallback to Data API via fetch
    const base = (process.env.MONGODB_DATA_API_URL || '').replace(/\/$/, '');
    const key = process.env.MONGODB_DATA_API_KEY;
    const dataSource = process.env.MONGODB_DATA_SOURCE || 'proyek-hargapangan';
    const dbName = process.env.MONGODB_DB || 'harga_pasar_mongo';
    if (!base || !key) throw new Error('Data API not configured');

    const fetchJson = async (action, body) => {
      const url = `${base}/action/${action}`;
      const payload = Object.assign({ dataSource, database: dbName }, body);
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': key }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(`Data API ${action} failed: ${r.status}`);
      return r.json();
    };

    const marketsRes = await fetchJson('find', { collection: 'pasar', filter: {}, projection: { nama_pasar: 1 }, limit: 5, sort: { nama_pasar: 1 } });
    const commRes = await fetchJson('find', { collection: 'komoditas', filter: {}, projection: { nama_komoditas: 1, unit: 1 }, limit: 5, sort: { nama_komoditas: 1 } });
    const pricesRes = await fetchJson('find', { collection: 'laporan_harga', filter: {}, limit: 5, sort: { tanggal_lapor: -1 } });

    const normalizeDocs = (docs) => (docs || []).map(d => {
      // normalize $oid and $date
      const copy = JSON.parse(JSON.stringify(d));
      function walk(o) {
        for (const k of Object.keys(o)) {
          const v = o[k];
          if (v && typeof v === 'object') {
            if ('$oid' in v) o[k] = v['$oid'];
            else if ('$date' in v) o[k] = v['$date'];
            else walk(v);
          }
        }
      }
      walk(copy);
      return copy;
    });

    const markets = normalizeDocs(marketsRes.documents || []);
    const comms = normalizeDocs(commRes.documents || []);
    const prices = normalizeDocs(pricesRes.documents || []);

    return res.status(200).send(JSON.stringify({ method: 'dataapi', samples: { markets, commodities: comms, prices_raw: prices } }));
  } catch (err) {
    return res.status(500).send(JSON.stringify({ error: err.message }));
  }
};
