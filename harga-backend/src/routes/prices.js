// harga-backend/src/routes/prices.js
import express from 'express';
import Report from '../models/Report.js';
import Market from '../models/Market.js';
import Commodity from '../models/Commodity.js';

const router = express.Router();

const MAX_PAGE_SIZE = 2000;

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function normalizeSort(s) {
  return String(s).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
}

function mapRow(doc) {
  return {
    id: String(doc._id),
    date: doc.tanggal_lapor?.toISOString().slice(0, 10),
    tanggal: doc.tanggal_lapor?.toISOString().slice(0, 10),
    price: doc.harga,
    harga: doc.harga,
    note: doc.keterangan ?? null,
    keterangan: doc.keterangan ?? null,
    photo_url: doc.foto_url ?? null,
    foto_url: doc.foto_url ?? null,
    gps_url: doc.gps_url ?? null,
    market_id: doc.market_id ? String(doc.market_id) : null,
    market: doc.market ?? null,
    market_name: doc.market ?? null,
    commodity_id: doc.commodity_id ? String(doc.commodity_id) : null,
    commodity: doc.commodity ?? null,
    commodity_name: doc.commodity ?? null,
  };
}

// ==============================
// GET /api/prices
// ==============================
router.get('/', async (req, res) => {
  try {
    const {
      from,
      to,
      marketId,
      market,
      commodityId,
      page = '1',
      pageSize = '50',
      sort = 'desc',
    } = req.query;

    const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, toInt(pageSize, 50)));
    const pageNum = Math.max(1, toInt(page, 1));
    const offset = (pageNum - 1) * limit;
    const order = normalizeSort(sort);

    const mFilter = {};
    if (from) mFilter.tanggal_lapor = { ...(mFilter.tanggal_lapor || {}), $gte: new Date(from) };
    if (to) mFilter.tanggal_lapor = { ...(mFilter.tanggal_lapor || {}), $lte: new Date(to) };

    const marketParam = marketId ?? market;
    if (marketParam && marketParam !== 'all') {
      const v = String(marketParam).trim();
      if (/^[0-9a-fA-F]{24}$/.test(v)) {
        mFilter.market_id = v;
      } else {
        const mk = await Market.findOne({ nama_pasar: v }).lean();
        if (mk) mFilter.market_id = mk._id;
      }
    }

    if (commodityId) {
      const v = String(commodityId).trim();
      if (/^[0-9a-fA-F]{24}$/.test(v)) {
        mFilter.komoditas_id = v;
      } else {
        const cm = await Commodity.findOne({ nama_komoditas: v }).lean();
        if (cm) mFilter.komoditas_id = cm._id;
      }
    }

    const total = await Report.countDocuments(mFilter);
    const sortSpec = order === 'ASC' ? { tanggal_lapor: 1, _id: 1 } : { tanggal_lapor: -1, _id: -1 };

    const docs = await Report.aggregate([
      { $match: mFilter },
      { $sort: sortSpec },
      { $skip: offset },
      { $limit: limit },
      { $lookup: { from: 'markets', localField: 'market_id', foreignField: '_id', as: 'm' } },
      { $lookup: { from: 'commodities', localField: 'komoditas_id', foreignField: '_id', as: 'c' } },
      { $unwind: { path: '$m', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
      { $project: {
          _id: '$_id',
          tanggal_lapor: '$tanggal_lapor',
          harga: '$harga',
          keterangan: '$keterangan',
          foto_url: '$foto_url',
          gps_url: '$gps_url',
          market_id: '$market_id',
          commodity_id: '$komoditas_id',
          market: '$m.nama_pasar',
          commodity: '$c.nama_komoditas',
        }
      }
    ]);

    const rows = docs.map(mapRow);
    res.json({ page: pageNum, pageSize: limit, total, rows });
  } catch (e) {
    console.error('[GET /api/prices] error:', e);
    res.status(500).json({ error: e?.message || 'Server error' });
  }
});

// ==============================
// PATCH /api/prices/:id
// ==============================
router.patch('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { price } = req.body || {};
    const value = Number(price);
    if (!Number.isFinite(value)) {
      return res.status(400).json({ ok: false, error: 'invalid price' });
    }

    const updated = await Report.findByIdAndUpdate(id, { harga: value }, { new: true }).lean();
    if (!updated) return res.status(404).json({ ok: false, error: 'not found' });

    const marketDoc = updated.market_id ? await Market.findById(updated.market_id).lean() : null;
    const commodityDoc = updated.komoditas_id ? await Commodity.findById(updated.komoditas_id).lean() : null;

    const row = mapRow({
      ...updated,
      market: marketDoc?.nama_pasar ?? null,
      commodity: commodityDoc?.nama_komoditas ?? null,
    });

    res.json({ ok: true, row });
  } catch (e) {
    console.error('[PATCH /api/prices/:id] error:', e);
    res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

// ==============================
// Placeholder endpoints (belum diporting ke Mongo)
// ==============================
const notImplemented = (_req, res) => res.status(501).json({ error: 'Fitur ini belum tersedia pada backend MongoDB.' });

router.get('/export-example.xlsx', notImplemented);
router.get('/bulk/preview', notImplemented);
router.delete('/bulk', notImplemented);
router.post('/bulk-delete/preview', notImplemented);
router.get('/bulk-delete/preview', notImplemented);
router.post('/preview-bulk-delete', notImplemented);
router.post('/delete/preview', notImplemented);
router.post('/bulk-delete', notImplemented);
router.delete('/', notImplemented);

export default router;
