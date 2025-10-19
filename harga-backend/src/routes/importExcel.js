// src/routes/importExcel.js
import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import { collections, getNextSeq } from "../tools/db.js";
import { parseMonthlySheet, guessYearFromFilename } from "../lib/excel.mjs";
import { bus } from '../events/bus.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* =========================
   Normalisasi nama komoditas
========================= */
function stripDiacritics(s) {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}
function rmUnits(s) {
  return s.replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, " ").trim();
}
function mkKey(raw) {
  let s = String(raw ?? "").trim();
  s = rmUnits(s);
  s = stripDiacritics(s).toLowerCase();
  s = s.replace(/\bcabe\b/g, "cabai");
  s = s.replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
  return s;
}
const normCommodityName = (raw) => mkKey(raw);

export function aliasesFor(name) {
  const k = mkKey(name);
  const out = new Set([k]);
  if (k.startsWith("ikan ")) out.add(k.slice(5)); else out.add(`ikan ${k}`);
  out.add(k.replace(/\bcabai\b/g, "cabe"));
  out.add(k.replace(/\bcabe\b/g, "cabai"));
  out.add(k.replace(/\s*\/\s*/g, "/"));
  return [...out];
}

/* =========================
   DB helpers
========================= */
async function resolveMarketId(_conn, payload) {
  const marketIdRaw = payload.marketId ?? payload.market_id;
  if (marketIdRaw != null && String(marketIdRaw).trim() !== "") {
    const id = Number(marketIdRaw);
    if (!Number.isFinite(id)) throw new Error("marketId tidak valid.");
    const { pasar } = collections();
    const row = await pasar.findOne({ id }, { projection: { id: 1 } });
    if (!row) throw new Error(`pasar id=${id} tidak ada`);
    return id;
  }
  const marketName = payload.market ?? payload.marketName;
  if (!marketName) throw new Error("marketId atau market/marketName wajib diisi.");
  const { pasar } = collections();
  const row = await pasar.findOne({ nama_pasar: marketName }, { projection: { id: 1 } });
  if (!row) throw new Error(`pasar "${marketName}" tidak ada`);
  return row.id;
}

async function getCommodityMap(_conn) {
  const { komoditas } = collections();
  const rows = await komoditas.find({}, { projection: { _id: 0, id: 1, nama_komoditas: 1 } }).toArray();
  const map = new Map();
  for (const r of rows) {
    const base = mkKey(r.nama_komoditas);
    map.set(base, r.id);
    for (const a of aliasesFor(r.nama_komoditas)) map.set(mkKey(a), r.id);
  }
  const manualAliases = [
    ["ikan haruan/ gabus", "ikan haruan/gabus"],
    ["haruan/ gabus", "ikan haruan/gabus"],
    ["haruan/gabus", "ikan haruan/gabus"],
    ["tongkol/ tuna", "ikan tongkol/tuna"],
    ["mas/ nila", "ikan mas/nila"],
    ["kembung/ pindang", "ikan kembung/pindang"],
    ["minyak goreng kemasan (rp/liter)", "minyak goreng kemasan"],
    ["minyak goreng curah (rp/liter)", "minyak goreng curah"],
    ["tepung terigu kemasan (rp/kg)", "tepung terigu kemasan"],
    ["tepung terigu curah (rp/kg)", "tepung terigu curah"],
    ["gula pasir (rp/kg)", "gula pasir"],
    ["telur ayam (rp/kg)", "telur ayam"],
    ["daging sapi (rp/kg)", "daging sapi"],
    ["daging ayam (rp/kg)", "daging ayam"],
    ["cabe rawit", "cabai rawit"],
  ];
  for (const [alias, canonical] of manualAliases) {
    const key = mkKey(alias), can = mkKey(canonical);
    if (map.get(can)) map.set(key, map.get(can));
  }
  return map;
}

async function upsertPriceRow(_conn, row) {
  const { laporan_harga } = collections();
  const newId = await getNextSeq('laporan_harga');
  await laporan_harga.updateOne(
    { market_id: row.market_id, komoditas_id: row.komoditas_id, tanggal_lapor: row.tanggal_lapor },
    {
      $set: {
        harga: row.harga,
        keterangan: row.keterangan ?? null,
        foto_url: row.foto_url ?? null,
        gps_url: row.gps_url ?? null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        status: 'verified',
        updated_at: new Date(),
      },
      $setOnInsert: { id: newId, created_at: new Date() },
    },
    { upsert: true }
  );
}

/* =========================
   Parser WIDE (export dashboard)
========================= */
function parseHargaFlex(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    if (v < 500 && String(v).includes(".")) return Math.round(v * 1000);
    return Math.round(v);
  }
  let s = String(v).trim();
  s = s.replace(/[^\d.,]/g, "");
  if (/\d+\.\d{3}(\.\d{3})*$/.test(s)) s = s.replace(/\./g, "");
  s = s.replace(/,/g, "");
  let n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 500 && /\.0+$/.test(String(v))) n = n * 1000;
  return Math.round(n);
}

function toISODateFlex(val, ctx) {
  if (!val && val !== 0) return null;
  const raw = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  let m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [_, dd, mm, yy] = m;
    if (yy.length === 2) yy = (Number(yy) > 70 ? "19" : "20") + yy;
    const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  if (/^\d{1,2}$/.test(raw) && ctx?.year && ctx?.month) {
    const d = new Date(Number(ctx.year), Number(ctx.month) - 1, Number(raw));
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  return null;
}

const ID_MONTH = {
  januari: 1, februari: 2, febuari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};
function guessMonthFromSheetName(name) {
  if (!name) return null;
  const k = String(name).toLowerCase().replace(/\s+/g, "");
  for (const [nm, no] of Object.entries(ID_MONTH)) if (k.includes(nm)) return no;
  return null;
}

function parseWideSheet(ws, { year, month, headerRowIndex } = {}) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  if (!rows.length) return { items: [], month: month ?? null };

  let hi = Number.isFinite(headerRowIndex) ? headerRowIndex : 0;
  const looksHeader = (r) => {
    const c0 = String(r?.[0] || "").toLowerCase();
    return (
      c0.includes("tanggal") || c0.includes("day") || c0.includes("hari") || c0.includes("tgl") ||
      c0 === "week" || c0 === "minggu"
    );
  };
  const guess = rows.findIndex(looksHeader);
  if (guess >= 0) hi = guess;

  const headerRaw = rows[hi].map((h) => String(h || "").trim());
  const header = headerRaw.map((h) => rmUnits(h));
  const items = [];
  const ctx = { year, month };

  let idxDate = 0;
  let idxWeek = -1;
  if (/^(week|minggu)$/i.test(header[0])) { idxWeek = 0; idxDate = 1; }
  if (!/^(tanggal|day|hari|tgl)$/i.test(header[idxDate] || "")) {
    const j = header.findIndex((h) => /^(tanggal|day|hari|tgl)$/i.test(String(h).toLowerCase()));
    if (j >= 0) idxDate = j;
  }

  const startCol = Math.max(idxDate + 1, idxWeek >= 0 ? 2 : 1);

  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((x) => String(x).trim() === "")) continue;

    const rawDate = r[idxDate];
    const iso = toISODateFlex(rawDate, ctx);
    if (!iso) continue;

    for (let c = startCol; c < header.length; c++) {
      const namaKolom = header[c];
      if (!namaKolom) continue;
      const harga = parseHargaFlex(r[c]);
      if (harga == null) continue;

      items.push({ tanggal_lapor: iso, komoditas_nama: namaKolom, harga });
    }
  }

  let m = month ?? null;
  if (!m && items.length) m = Number(items[0].tanggal_lapor.split("-")[1]);
  return { items, month: m, headerRaw, headerNorm: header.map(mkKey) };
}

/* =========================
   SINGLE (relatif path) + alias /upload
========================= */
async function handleSingle(req, res) {
  try {
    const truncate = String(req.query.truncate ?? "1") === "1";
    const { month, year } = req.body;

    if (!req.file)  return res.status(400).json({ message: "file wajib" });
    if (!month || !year) return res.status(400).json({ message: "month & year wajib" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    let parsed = parseMonthlySheet(ws, { year: Number(year) });
    if (!parsed?.items?.length) {
      parsed = parseWideSheet(ws, { year: Number(year), month: Number(month) });
    }

    const { items, month: parsedMonth, headerNorm = [], headerRaw = [] } = parsed;
    if (!items.length) {
      return res.status(400).json({
        message: "Sheet tidak valid/kosong. Pastikan ada kolom Tanggal/Day/Tgl dan kolom komoditas.",
        headerRaw,
      });
    }

    const market_id = await resolveMarketId(null, req.body);
    const komoditasMap = await getCommodityMap(null);

      const useMonth = Number(parsedMonth || month);
      if (truncate) {
        const { laporan_harga } = collections();
        const start = `${Number(year)}-${String(useMonth).padStart(2,'0')}-01`;
        const endMonth = useMonth === 12 ? 1 : useMonth + 1;
        const endYear = useMonth === 12 ? Number(year) + 1 : Number(year);
        const end = `${endYear}-${String(endMonth).padStart(2,'0')}-01`;
        await laporan_harga.deleteMany({ market_id, tanggal_lapor: { $gte: start, $lt: end } });
      }

      let imported = 0, skipped = 0;
      const stats = new Map();
      const unknown = new Set();
      const bump = (n, k) => {
        const s = stats.get(n) || { imported: 0, skipped: 0 };
        s[k]++; stats.set(n, s);
      };

      for (const it of items) {
        const rawNama = String(it.komoditas_nama ?? "").trim();
        const keyNama = normCommodityName(rawNama);
        if (!keyNama) continue;

        const komoditas_id = komoditasMap.get(keyNama);
        if (!komoditas_id) { skipped++; unknown.add(rawNama); bump(keyNama, "skipped"); continue; }

        await upsertPriceRow(null, {
          market_id, komoditas_id,
          tanggal_lapor: it.tanggal_lapor,
          harga: it.harga,
        });
        imported++; bump(keyNama, "imported");
      }

      const statsObj = Object.fromEntries([...stats.entries()]);

      // 🔔 broadcast ke semua klien
      bus.emit('prices:changed', {
        reason: 'import-single',
        marketId: market_id,
        month: useMonth,
        year: Number(year),
        at: Date.now(),
      });

      return res.json({
        ok: true,
        imported,
        skipped,
        month: useMonth,
        year: Number(year),
        stats: statsObj,
        unknown_names: [...unknown],
        headerRaw,
        headerNorm,
      });
    
  } catch (e) {
    console.error("[POST /api/import-excel] error:", e);
    return res.status(500).json({ message: "import gagal" });
  }
}

/* =========================
   BULK (relatif path)
========================= */
async function handleBulk(req, res) {
  try {
    const truncate = String(req.query.truncate ?? "1") === "1";
    const { year: bodyYear } = req.body;

    if (!req.file)  return res.status(400).json({ message: "file wajib" });

    const year = Number(bodyYear || guessYearFromFilename(req.file.originalname));
    if (!year)
      return res.status(400).json({ message: 'tahun tidak terdeteksi; isi "year" atau sertakan -YYYY pada nama file' });

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });

    const market_id = await resolveMarketId(null, req.body);
    const komoditasMap = await getCommodityMap(null);

      let imported = 0, skipped = 0, sheetCount = 0;
      const stats = new Map();
      const unknown = new Set();
      const bump = (n, k) => {
        const s = stats.get(n) || { imported: 0, skipped: 0 };
        s[k]++; stats.set(n, s);
      };

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];

        let parsed = parseMonthlySheet(ws, { year });
        if (!parsed?.items?.length) {
          parsed = parseWideSheet(ws, { year, month: guessMonthFromSheetName(sheetName) });
        }

        const { items, month, headerNorm = [], headerRaw = [] } = parsed;
        if (!month || !items.length) continue;

        sheetCount++;

        if (truncate) {
          const { laporan_harga } = collections();
          const start = `${year}-${String(month).padStart(2,'0')}-01`;
          const endMonth = month === 12 ? 1 : month + 1;
          const endYear = month === 12 ? year + 1 : year;
          const end = `${endYear}-${String(endMonth).padStart(2,'0')}-01`;
          await laporan_harga.deleteMany({ market_id, tanggal_lapor: { $gte: start, $lt: end } });
        }

        for (const it of items) {
          const key = mkKey(it.komoditas_nama);
          const komoditas_id = komoditasMap.get(key);
          if (!komoditas_id) { skipped++; unknown.add(it.komoditas_nama); bump(key, "skipped"); continue; }

          try {
            await upsertPriceRow(null, {
              market_id,
              komoditas_id,
              tanggal_lapor: it.tanggal_lapor,
              harga: it.harga,
            });
            imported++; bump(key, "imported");
          } catch {
            skipped++; bump(key, "skipped");
          }
        }
      }

      if (sheetCount === 0)
        return res.status(400).json({ message: "Tidak ada sheet bulanan valid." });

      const statsObj = Object.fromEntries([...stats.entries()]);

      // 🔔 broadcast
      bus.emit('prices:changed', {
        reason: 'import-bulk',
        marketId: null, // bisa diisi market_id jika mau fokus 1 pasar
        year,
        at: Date.now(),
      });

      return res.json({
        ok: true,
        imported,
        skipped,
        sheets: sheetCount,
        year,
        stats: statsObj,
        unknown_names: [...unknown],
      });
    
  } catch (e) {
    console.error("[POST /api/import-excel/bulk] error:", e);
    return res.status(500).json({ message: "import gagal" });
  }
}

/* =========================
   ROUTES (RELATIF)
========================= */
router.post("/", upload.single("file"), handleSingle);
router.post("/upload", upload.single("file"), handleSingle);
router.post("/bulk", upload.single("file"), handleBulk);

export default router;
