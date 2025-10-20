// harga-backend/src/routes/prices.js
import express from "express";
import { collections } from "../tools/db.js";
import XLSX from "xlsx";
import { buildExampleWorkbook } from "../lib/excel.mjs";
import { deleteFromBlob } from "../lib/blob.js";

const router = express.Router();
const TABLE = "laporan_harga";

// util kecil
function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}
function normalizeSort(s) {
  return String(s).toLowerCase() === "asc" ? "ASC" : "DESC";
}

// ==============================
// GET /api/prices
// Query: from, to, marketId | market, commodityId, page, pageSize, sort(asc|desc)
// ==============================
router.get("/", async (req, res) => {
  try {
    let {
      from,
      to,
      marketId,              // id pasar (angka)
      market,                // alias: id atau nama pasar
      commodityId,
      page = "1",
      pageSize = "50",
      sort = "desc",
    } = req.query;

    // Normalisasi "market": kalau tidak ada marketId tapi ada market → pakai itu
    // market bisa berisi id (numeric) ATAU nama_pasar (string)
    const marketParam = (marketId ?? market);

    const match = {};
    if (from) match.tanggal_lapor = { ...(match.tanggal_lapor || {}), $gte: String(from).slice(0,10) };
    if (to)   match.tanggal_lapor = { ...(match.tanggal_lapor || {}), $lte: String(to).slice(0,10) };
    if (marketParam && marketParam !== "all") {
      const v = String(marketParam).trim();
      if (/^\d+$/.test(v)) match.market_id = Number(v);
      else {
        const { pasar } = collections();
        const p = await pasar.findOne({ nama_pasar: v }, { projection: { id: 1 } });
        match.market_id = p?.id ?? -999999; // non-match jika tidak ada
      }
    }
    if (commodityId) {
      const v = String(commodityId).trim();
      if (/^\d+$/.test(v)) match.komoditas_id = Number(v);
      else {
        const { komoditas } = collections();
        const k = await komoditas.findOne({ nama_komoditas: v }, { projection: { id: 1 } });
        match.komoditas_id = k?.id ?? -999999;
      }
    }

    const limit   = Math.max(1, Math.min(50000, toInt(pageSize, 50)));
    const pageNum = Math.max(1, toInt(page, 1));
    const offset  = (pageNum - 1) * limit;
    const order   = normalizeSort(sort);

    const { laporan_harga, pasar, komoditas } = collections();
    const total = await laporan_harga.countDocuments(match);

    const rows = await laporan_harga.aggregate([
      { $match: match },
      { $sort: { tanggal_lapor: order === 'ASC' ? 1 : -1, id: order === 'ASC' ? 1 : -1 } },
      { $skip: offset },
      { $limit: limit },
      { $lookup: { from: 'pasar', localField: 'market_id', foreignField: 'id', as: 'p' } },
      { $lookup: { from: 'komoditas', localField: 'komoditas_id', foreignField: 'id', as: 'k' } },
      { $addFields: { p: { $arrayElemAt: ['$p', 0] }, k: { $arrayElemAt: ['$k', 0] } } },
      { $project: {
          _id: 0,
          id: 1,
          date: '$tanggal_lapor',
          tanggal: '$tanggal_lapor',
          price: '$harga',
          harga: '$harga',
          note: '$keterangan',
          keterangan: '$keterangan',
          photo_url: '$foto_url',
          foto_url: '$foto_url',
          gps_url: 1,
          market_id: '$market_id',
          market: '$p.nama_pasar',
          market_name: '$p.nama_pasar',
          commodity_id: '$komoditas_id',
          commodity: '$k.nama_komoditas',
          commodity_name: '$k.nama_komoditas',
        }
      }
    ]).toArray();

    return res.json({ page: pageNum, pageSize: limit, total, rows });
  } catch (e) {
    console.error("[GET /api/prices] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// ==============================
// PATCH /api/prices/:id   (edit harga manual dari dashboard)
// Body: { price: number, note?: string }
// ==============================
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { price /*, note */ } = req.body || {};
    const n = Number(price);
    if (!Number.isFinite(n)) {
      return res.status(400).json({ ok: false, error: "invalid price" });
    }
    const { laporan_harga } = collections();
    await laporan_harga.updateOne({ id }, { $set: { harga: n, updated_at: new Date() } });

    const rows = await laporan_harga.aggregate([
      { $match: { id } },
      { $limit: 1 },
      { $lookup: { from: 'pasar', localField: 'market_id', foreignField: 'id', as: 'p' } },
      { $lookup: { from: 'komoditas', localField: 'komoditas_id', foreignField: 'id', as: 'k' } },
      { $addFields: { p: { $arrayElemAt: ['$p', 0] }, k: { $arrayElemAt: ['$k', 0] } } },
      { $project: {
          _id: 0,
          id: 1,
          date: '$tanggal_lapor',
          tanggal: '$tanggal_lapor',
          price: '$harga',
          harga: '$harga',
          note: '$keterangan',
          keterangan: '$keterangan',
          photo_url: '$foto_url',
          foto_url: '$foto_url',
          gps_url: 1,
          market_id: '$market_id',
          market: '$p.nama_pasar',
          market_name: '$p.nama_pasar',
          commodity_id: '$komoditas_id',
          commodity: '$k.nama_komoditas',
          commodity_name: '$k.nama_komoditas',
        }
      }
    ]).toArray();

    const row = rows?.[0] || null;
    return res.json({ ok: true, row });
  } catch (e) {
    console.error("[PATCH /api/prices/:id] error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

// ==============================
// GET /api/prices/export-example.xlsx
// Query: marketId, year, month
// ==============================
router.get("/export-example.xlsx", async (req, res) => {
  try {
    const marketId = Number(req.query.marketId);
    const year  = Number(req.query.year);
    const month = Number(req.query.month);

    if (!marketId || !year || !month) {
      return res.status(400).json({ error: "marketId, year, month wajib" });
    }

    const { pasar, laporan_harga, komoditas } = collections();
    const p = await pasar.findOne({ id: marketId }, { projection: { nama_pasar: 1 } });
    if (!p) {
      return res.status(400).json({ error: "market tidak ditemukan" });
    }
    const marketName = p.nama_pasar;

    // Data 1 bulan
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    const rows = await laporan_harga.aggregate([
      { $match: { market_id: marketId, tanggal_lapor: { $gte: start, $lt: end } } },
      { $lookup: { from: 'komoditas', localField: 'komoditas_id', foreignField: 'id', as: 'k' } },
      { $addFields: { k: { $arrayElemAt: ['$k', 0] } } },
      { $project: { _id: 0, tanggal: '$tanggal_lapor', komoditas: '$k.nama_komoditas', harga: '$harga' } },
      { $sort: { tanggal: 1, komoditas: 1 } },
    ]).toArray();

    // Urutan & unit komoditas
    const commodityOrder = [
      "Beras",
      "Minyak Goreng Kemasan",
      "Minyak Goreng Curah",
      "Tepung Terigu Kemasan",
      "Tepung Terigu Curah",
      "Gula Pasir",
      "Telur Ayam",
      "Daging Sapi",
      "Daging Ayam",
      "Kedelai",
      "Bawang Merah",
      "Bawang Putih",
      "Cabe Merah Besar",
      "Cabe Rawit",
      "Ikan Haruan/ Gabus",
      "Ikan Tongkol/Tuna",
      "Ikan Mas/Nila",
      "Ikan Patin",
      "Ikan Papuyu/Betok",
      "Ikan Bandeng",
      "Ikan Kembung/Pindang",
    ];
    const unitsMap = Object.fromEntries(commodityOrder.map((nm) => [nm, "(Rp/Kg)"]));
    unitsMap["Minyak Goreng Kemasan"] = "(Rp/Liter)";
    unitsMap["Minyak Goreng Curah"]   = "(Rp/Liter)";

    const data = rows.map((r) => ({
      tanggal: r.tanggal,
      komoditas: r.komoditas,
      harga: r.harga ?? "",
    }));

    const title = `Harga Pasar Bahan Pangan Tingkat Produsen di ${marketName} Tahun ${year}`;
    const wb = buildExampleWorkbook({ title, month, data, commodityOrder, unitsMap });
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${marketName}-${String(month).padStart(2, "0")}-${year}.xlsx"`
    );
    res.send(buf);
  } catch (e) {
    console.error("[GET /api/prices/export-example.xlsx] error:", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

// ==============================
// BULK DELETE: preview & eksekusi
// (TETAP: endpoint kamu sebelumnya /bulk/preview & /bulk)
// + ALIAS: supaya semua panggilan lama/baru tidak 404
// ==============================

// helper
async function _countMonth(marketId, year, month) {
  const { laporan_harga } = collections();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
  return laporan_harga.countDocuments({ market_id: marketId, tanggal_lapor: { $gte: start, $lt: end } });
}
async function _deleteMonth(marketId, year, month) {
  const { laporan_harga } = collections();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
  
  // 1. Ambil semua records yang akan dihapus untuk cleanup foto
  const recordsToDelete = await laporan_harga.find({ 
    market_id: marketId, 
    tanggal_lapor: { $gte: start, $lt: end } 
  }).toArray();
  
  // 2. Kumpulkan semua foto URLs
  const fotoUrls = recordsToDelete
    .map(r => r.foto_url)
    .filter(url => url && typeof url === 'string' && url.trim());
  
  // 3. Hapus foto dari Vercel Blob Storage
  let deletedPhotos = 0;
  for (const url of fotoUrls) {
    try {
      await deleteFromBlob(url);
      deletedPhotos++;
    } catch (err) {
      console.error(`[_deleteMonth] Failed to delete photo ${url}:`, err.message);
      // Continue dengan foto lainnya meskipun ada yang gagal
    }
  }
  
  console.log(`[_deleteMonth] Deleted ${deletedPhotos}/${fotoUrls.length} photos from Blob Storage`);
  
  // 4. Hapus records dari MongoDB
  const res = await laporan_harga.deleteMany({ market_id: marketId, tanggal_lapor: { $gte: start, $lt: end } });
  return Number(res?.deletedCount ?? 0);
}

// === EXISTING kamu ===
// GET /api/prices/bulk/preview?marketId=1&year=2024&month=7
router.get("/bulk/preview", async (req, res) => {
  try {
    const marketId = Number(req.query.marketId);
    const year  = Number(req.query.year);
    const month = Number(req.query.month);
    if (!marketId || !year || !month) {
      return res.status(400).json({ error: "marketId, year, month wajib" });
    }
    const total = await _countMonth(marketId, year, month);
    return res.json({ total });
  } catch (e) {
    console.error("[GET /api/prices/bulk/preview] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// DELETE /api/prices/bulk?marketId=1&year=2024&month=7&confirm=YES_DELETE
router.delete("/bulk", async (req, res) => {
  try {
    const marketId = Number(req.query.marketId);
    const year  = Number(req.query.year);
    const month = Number(req.query.month);
    const confirm = String(req.query.confirm || "");
    if (!marketId || !year || !month) {
      return res.status(400).json({ ok: false, error: "marketId, year, month wajib" });
    }
    if (confirm !== "YES_DELETE") {
      return res.status(400).json({ ok: false, error: "set query confirm=YES_DELETE untuk konfirmasi" });
    }
    const previewTotal = await _countMonth(marketId, year, month);
    const deleted = await _deleteMonth(marketId, year, month);
    return res.json({ ok: true, requested: { marketId, year, month }, previewTotal, deleted });
  } catch (e) {
    console.error("[DELETE /api/prices/bulk] error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

// === ALIAS yang diminta front-end (HILANGKAN 404) ===

// POST /api/prices/bulk-delete/preview  (body: { marketId, year, month })
router.post("/bulk-delete/preview", async (req, res) => {
  try {
    const { marketId, year, month } = req.body || {};
    if (!marketId || !year || !month) {
      return res.status(400).json({ error: "marketId, year, month wajib" });
    }
    const total = await _countMonth(Number(marketId), Number(year), Number(month));
    return res.json({ total });
  } catch (e) {
    console.error("[POST /api/prices/bulk-delete/preview] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// GET /api/prices/bulk-delete/preview?marketId=&year=&month=
router.get("/bulk-delete/preview", async (req, res) => {
  try {
    const marketId = Number(req.query.marketId);
    const year  = Number(req.query.year);
    const month = Number(req.query.month);
    if (!marketId || !year || !month) {
      return res.status(400).json({ error: "marketId, year, month wajib" });
    }
    const total = await _countMonth(marketId, year, month);
    return res.json({ total });
  } catch (e) {
    console.error("[GET /api/prices/bulk-delete/preview] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// POST /api/prices/preview-bulk-delete (alias lama)
router.post("/preview-bulk-delete", async (req, res) => {
  try {
    const { marketId, year, month } = req.body || {};
    if (!marketId || !year || !month) {
      return res.status(400).json({ error: "marketId, year, month wajib" });
    }
    const total = await _countMonth(Number(marketId), Number(year), Number(month));
    return res.json({ total });
  } catch (e) {
    console.error("[POST /api/prices/preview-bulk-delete] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// POST /api/prices/delete/preview (alias lama)
router.post("/delete/preview", async (req, res) => {
  try {
    const { marketId, year, month } = req.body || {};
    if (!marketId || !year || !month) {
      return res.status(400).json({ error: "marketId, year, month wajib" });
    }
    const total = await _countMonth(Number(marketId), Number(year), Number(month));
    return res.json({ total });
  } catch (e) {
    console.error("[POST /api/prices/delete/preview] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// POST /api/prices/bulk-delete (hapus) — body: {marketId, year, month}
router.post("/bulk-delete", async (req, res) => {
  try {
    const { marketId, year, month } = req.body || {};
    if (!marketId || !year || !month) {
      return res.status(400).json({ ok: false, error: "marketId, year, month wajib" });
    }
    const previewTotal = await _countMonth(Number(marketId), Number(year), Number(month));
    const deleted = await _deleteMonth(Number(marketId), Number(year), Number(month));
    return res.json({ ok: true, previewTotal, deleted });
  } catch (e) {
    console.error("[POST /api/prices/bulk-delete] error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

// DELETE /api/prices?marketId=&year=&month=&scope=month (alias lama)
router.delete("/", async (req, res) => {
  try {
    if (String(req.query.scope) !== "month") {
      return res.status(404).json({ error: "Not found" });
    }
    const marketId = Number(req.query.marketId);
    const year  = Number(req.query.year);
    const month = Number(req.query.month);
    if (!marketId || !year || !month) {
      return res.status(400).json({ ok: false, error: "marketId, year, month wajib" });
    }
    const previewTotal = await _countMonth(marketId, year, month);
    const deleted = await _deleteMonth(marketId, year, month);
    return res.json({ ok: true, previewTotal, deleted });
  } catch (e) {
    console.error("[DELETE /api/prices?scope=month] error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

export default router;
