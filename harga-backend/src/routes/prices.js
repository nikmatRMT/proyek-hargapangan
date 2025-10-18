// harga-backend/src/routes/prices.js
import express from "express";
import { pool } from "../tools/db.js";
import { isMongo } from "../tools/mongo.js";
import Report from "../models/Report.js";
import Market from "../models/Market.js";
import Commodity from "../models/Commodity.js";
import XLSX from "xlsx";
import { buildExampleWorkbook } from "../lib/excel.mjs";

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

    const MAX_PAGE_SIZE = 2000;
    const limit   = Math.max(1, Math.min(MAX_PAGE_SIZE, toInt(pageSize, 50)));
    const pageNum = Math.max(1, toInt(page, 1));
    const offset  = (pageNum - 1) * limit;
    const order   = normalizeSort(sort);

    if (isMongo()) {
      const mFilter = {};
      if (from) mFilter.tanggal_lapor = { ...(mFilter.tanggal_lapor||{}), $gte: new Date(from) };
      if (to)   mFilter.tanggal_lapor = { ...(mFilter.tanggal_lapor||{}), $lte: new Date(to) };

      // market filter: by id or by name
      if (marketId || market) {
        const v = String(marketId ?? market).trim();
        if (v && v !== 'all') {
          if (/^[0-9a-fA-F]{24}$/.test(v)) {
            mFilter.market_id = v;
          } else {
            const mk = await Market.findOne({ nama_pasar: v }).lean();
            if (mk) mFilter.market_id = mk._id;
          }
        }
      }

      // commodity filter: by id or by name
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

      const rows = await Report.aggregate([
        { $match: mFilter },
        { $sort: sortSpec },
        { $skip: offset },
        { $limit: limit },
        { $lookup: { from: 'markets', localField: 'market_id', foreignField: '_id', as: 'm' } },
        { $lookup: { from: 'commodities', localField: 'komoditas_id', foreignField: '_id', as: 'c' } },
        { $unwind: { path: '$m', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
        { $project: {
            id: '$_id',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$tanggal_lapor' } },
            tanggal: { $dateToString: { format: '%Y-%m-%d', date: '$tanggal_lapor' } },
            price: '$harga',
            harga: '$harga',
            note: '$keterangan',
            keterangan: '$keterangan',
            photo_url: '$foto_url',
            foto_url: '$foto_url',
            gps_url: '$gps_url',
            market_id: '$market_id',
            market: '$m.nama_pasar',
            market_name: '$m.nama_pasar',
            commodity_id: '$komoditas_id',
            commodity: '$c.nama_komoditas',
            commodity_name: '$c.nama_komoditas',
          }
        }
      ]);

      // Stringify ObjectId fields for konsistensi
      const mapped = rows.map(r => ({
        ...r,
        id: String(r.id),
        market_id: r.market_id ? String(r.market_id) : null,
        commodity_id: r.commodity_id ? String(r.commodity_id) : null,
      }));

      return res.json({ page: pageNum, pageSize: limit, total, rows: mapped });
    }

    // MySQL path (lama)
    const where = [];
    const params = [];
    if (from) { where.push("lh.tanggal_lapor >= ?"); params.push(from); }
    if (to)   { where.push("lh.tanggal_lapor <= ?"); params.push(to); }
    if (marketId || market) {
      const v = String(marketId ?? market).trim();
      if (/^\d+$/.test(v)) { where.push("lh.market_id = ?"); params.push(Number(v)); }
      else                 { where.push("p.nama_pasar = ?"); params.push(v); }
    }
    if (commodityId) {
      const v = String(commodityId).trim();
      if (/^\d+$/.test(v)) { where.push("lh.komoditas_id = ?"); params.push(Number(v)); }
      else                 { where.push("k.nama_komoditas = ?"); params.push(v); }
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Hitung total (MySQL)
    const [cntRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM ${TABLE} lh
      JOIN pasar p     ON p.id = lh.market_id
      JOIN komoditas k ON k.id = lh.komoditas_id
      ${whereSql}
      `,
      params
    );
    const total = Number(cntRows?.[0]?.total ?? 0);

    // Data halaman (MySQL)
    const [rows] = await pool.query(
      `
      SELECT
        lh.id,
        DATE_FORMAT(lh.tanggal_lapor, '%Y-%m-%d') AS date,
        DATE_FORMAT(lh.tanggal_lapor, '%Y-%m-%d') AS tanggal,     -- alias
        lh.harga        AS price,
        lh.harga        AS harga,       -- alias
        lh.keterangan   AS note,
        lh.keterangan   AS keterangan,  -- alias
        lh.foto_url     AS photo_url,
        lh.foto_url     AS foto_url,    -- alias
        lh.gps_url      AS gps_url,
        p.id            AS market_id,
        p.nama_pasar    AS market,
        p.nama_pasar    AS market_name, -- alias
        k.id            AS commodity_id,
        k.nama_komoditas AS commodity,
        k.nama_komoditas AS commodity_name -- alias
      FROM ${TABLE} lh
      JOIN pasar p     ON p.id = lh.market_id
      JOIN komoditas k ON k.id = lh.komoditas_id
      ${whereSql}
      ORDER BY lh.tanggal_lapor ${order}, lh.id ${order}
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

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

    await pool.query(
      `UPDATE ${TABLE} SET harga = ?, updated_at = NOW() WHERE id = ?`,
      [n, id]
    );

    const [rows] = await pool.query(
      `
      SELECT
        lh.id,
        DATE_FORMAT(lh.tanggal_lapor, '%Y-%m-%d') AS date,
        DATE_FORMAT(lh.tanggal_lapor, '%Y-%m-%d') AS tanggal,
        lh.harga        AS price,
        lh.harga        AS harga,
        lh.keterangan   AS note,
        lh.keterangan   AS keterangan,
        lh.foto_url     AS photo_url,
        lh.foto_url     AS foto_url,
        lh.gps_url      AS gps_url,
        p.id            AS market_id,
        p.nama_pasar    AS market,
        p.nama_pasar    AS market_name,
        k.id            AS commodity_id,
        k.nama_komoditas AS commodity,
        k.nama_komoditas AS commodity_name
      FROM ${TABLE} lh
      JOIN pasar p     ON p.id = lh.market_id
      JOIN komoditas k ON k.id = lh.komoditas_id
      WHERE lh.id = ?
      LIMIT 1
      `,
      [id]
    );

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

    // Nama pasar
    const [mrows] = await pool.query(
      "SELECT nama_pasar FROM pasar WHERE id = ?",
      [marketId]
    );
    if (!mrows?.[0]) {
      return res.status(400).json({ error: "market tidak ditemukan" });
    }
    const marketName = mrows[0].nama_pasar;

    // Data 1 bulan
    const [rows] = await pool.query(
      `
      SELECT
        DATE_FORMAT(lh.tanggal_lapor, '%Y-%m-%d') AS tanggal,
        k.nama_komoditas AS komoditas,
        lh.harga
      FROM ${TABLE} lh
      JOIN komoditas k ON k.id = lh.komoditas_id
      WHERE lh.market_id = ? AND YEAR(lh.tanggal_lapor) = ? AND MONTH(lh.tanggal_lapor) = ?
      ORDER BY lh.tanggal_lapor ASC, k.nama_komoditas ASC
      `,
      [marketId, year, month]
    );

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
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM ${TABLE}
     WHERE market_id = ? AND YEAR(tanggal_lapor) = ? AND MONTH(tanggal_lapor) = ?`,
    [marketId, year, month]
  );
  return Number(rows?.[0]?.total ?? 0);
}
async function _deleteMonth(marketId, year, month) {
  const [res] = await pool.query(
    `DELETE FROM ${TABLE}
     WHERE market_id = ? AND YEAR(tanggal_lapor) = ? AND MONTH(tanggal_lapor) = ?`,
    [marketId, year, month]
  );
  return Number(res?.affectedRows ?? 0);
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
