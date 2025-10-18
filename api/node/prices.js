const getDb = require('../_mongo');

function parseQuery(q = {}) {
  const out = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === 'all') continue;
    out[k] = s;
  }
  return out;
}

function toISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

module.exports = async function handler(req, res) {
  try {
    const db = await getDb();
    const params = parseQuery(req.query || {});

    // Build mapping for numeric IDs (fetch all to ensure complete mapping)
    const markets = await db.collection('pasar').find({}).sort({ nama_pasar: 1 }).toArray();
    const comms = await db.collection('komoditas').find({}).sort({ nama_komoditas: 1 }).toArray();
    const numToMarket = new Map();
    const marketIdByOid = new Map();
    markets.forEach((m, i) => { numToMarket.set(i + 1, m); marketIdByOid.set(String(m._id), i + 1); });
    const numToComm = new Map();
    const commIdByOid = new Map();
    comms.forEach((c, i) => { numToComm.set(i + 1, c); commIdByOid.set(String(c._id), i + 1); });

    // Filters
    let { from, to, year, month, marketId, market, sort = 'desc' } = params;
    if (year && month) {
      const y = String(year).padStart(4, '0');
      const m = String(month).padStart(2, '0');
      const last = new Date(Number(y), Number(m), 0).getDate();
      from = `${y}-${m}-01`;
      to = `${y}-${m}-${String(last).padStart(2, '0')}`;
    }
    const filter = {};
    if (from || to) {
      const dt = {};
      if (from) dt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) dt.$lte = new Date(`${to}T23:59:59.999Z`);
      filter.tanggal_lapor = dt;
    }
    const midParam = marketId || market;
    if (midParam && String(midParam).toLowerCase() !== 'all') {
      const n = Number(midParam);
      if (Number.isFinite(n) && n > 0) {
        const mdoc = numToMarket.get(n);
        if (mdoc) filter.market_id = mdoc._id;
      }
    }

    const page = Number(params.page || 1);
    const pageSize = Number(params.pageSize || 2000);
    const skip = Math.max(0, (page - 1) * pageSize);
    const limit = pageSize;

    const coll = db.collection('laporan_harga');
    const total = await coll.countDocuments(filter);
    const docs = await coll
      .find(filter)
      .sort({ tanggal_lapor: sort === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const rows = docs.map((d) => {
      const date = d.tanggal_lapor ? toISO(new Date(d.tanggal_lapor)) : '';
      const mid = marketIdByOid.get(String(d.market_id));
      const cid = commIdByOid.get(String(d.komoditas_id));
      const mdoc = numToMarket.get(mid || 0) || { nama_pasar: '' };
      const cdoc = numToComm.get(cid || 0) || { nama_komoditas: '', unit: 'kg' };
      return {
        date,
        market_id: mid || null,
        market_name: mdoc.nama_pasar,
        commodity_id: cid || null,
        commodity_name: cdoc.nama_komoditas,
        unit: cdoc.unit || 'kg',
        price: Number(d.harga || 0),
        notes: d.keterangan || null,
      };
    });

    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify({ rows, total }));
  } catch (e) {
    res.status(500).end(JSON.stringify({ message: e?.message || String(e) }));
  }
};
