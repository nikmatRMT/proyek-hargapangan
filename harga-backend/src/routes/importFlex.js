// src/routes/importFlex.js
import express from "express";
import XLSX from "xlsx";
import { pool } from '../tools/db.js';


const router = express.Router();

/* ---------- util kecil ---------- */
const HEADER_ALIASES = {
  tanggal: ["tanggal", "tgl", "date", "tanggal_lapor"],
  pasar: ["pasar", "market", "nama_pasar"],
  komoditas: ["komoditas", "komoditi", "commodity", "nama_komoditas"],
  harga: ["harga", "price", "nilai", "rp"],
  keterangan: ["keterangan", "catatan", "note"],
};

function norm(s) { return String(s ?? "").trim().toLowerCase(); }
function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, ""); }

function parseExcelDate(v) {
  // dukung serial excel & beragam format
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }
  const s = String(v).trim().replace(/\//g, "-").replace(/\./g, "-");
  const p = s.split("-");
  if (p.length === 3) {
    let d = new Date(`${p[0]}-${p[1]}-${p[2]}`); // yyyy-mm-dd
    if (!isNaN(d)) return d;
    d = new Date(`${p[2]}-${p[1]}-${p[0]}`);     // dd-mm-yyyy
    if (!isNaN(d)) return d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function parsePriceId(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  s = s.replace(/rp/gi, "").replace(/\s/g, "");
  // hapus titik ribuan & ubah koma ke titik
  s = s.replace(/\.(?=\d{3}\b)/g, "");
  s = s.replace(/,/g, ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function guessHeaderMap(headerRow = []) {
  const map = {};
  headerRow.forEach((h, i) => {
    const key = slug(h);
    for (const target in HEADER_ALIASES) {
      if (HEADER_ALIASES[target].some(a => slug(a) === key)) {
        map[target] = i;
      }
    }
  });
  return map;
}

/* ---------- normalisasi komoditas ---------- */
function makeKomoditasMap(rows) {
  const m = new Map();
  for (const r of rows) {
    const s = slug(r.nama_komoditas);
    if (!m.has(s)) m.set(s, r.id);
    // alias ringan
    m.set(slug(r.nama_komoditas.replace(/[\/]/g, "")), r.id);
  }
  // alias custom
  const alias = [
    ["ikangabusharuan", "Ikan Haruan/ Gabus"],
    ["ikantongkoltuna", "Ikan Tongkol/Tuna"],
    ["ikanmasnila", "Ikan Mas/Nila"],
    ["ikanpapuyubetok", "Ikan Papuyu/Betok"],
    ["ikankembungpindang", "Ikan Kembung/Pindang"],
    ["cabemerah", "Cabe Merah Besar"],
  ];
  for (const [a, name] of alias) m.set(a, rows.find(r => r.nama_komoditas === name)?.id);
  return m;
}

function mapKomoditasId(name, map) {
  const s = slug(name);
  return map.get(s) || map.get(s.replace(/[\/]/g, "")) || null;
}

/* ---------- builder dari format WIDE & LONG ---------- */
function buildFromWide(sheetAOA) {
  const header = sheetAOA[0];
  const out = [];
  for (let r = 1; r < sheetAOA.length; r++) {
    const row = sheetAOA[r];
    const d = parseExcelDate(row[0]);
    if (!d) continue;
    for (let c = 1; c < header.length; c++) {
      const kom = header[c];
      if (!kom) continue;
      const price = parsePriceId(row[c]);
      if (price == null) continue;
      out.push({ tanggal: toISO(d), komoditas: String(kom), harga: price });
    }
  }
  return out;
}

function buildFromLong(sheetAOA) {
  const header = sheetAOA[0].map(x => String(x ?? ""));
  const idx = guessHeaderMap(header);
  if (idx.tanggal == null || idx.komoditas == null || idx.harga == null) return null;
  const out = [];
  for (let r = 1; r < sheetAOA.length; r++) {
    const row = sheetAOA[r];
    const d = parseExcelDate(row[idx.tanggal]);
    if (!d) continue;
    const harga = parsePriceId(row[idx.harga]);
    if (harga == null) continue;
    out.push({
      tanggal: toISO(d),
      komoditas: String(row[idx.komoditas] ?? ""),
      harga,
      pasar: idx.pasar != null ? String(row[idx.pasar] ?? "") : null,
      keterangan: idx.keterangan != null ? String(row[idx.keterangan] ?? "") : null,
    });
  }
  return out;
}

/* ---------- ROUTE: import fleksibel ---------- */
router.post("/api/import-flex", async (req, res) => {
  try {
    // butuh middleware upload (lihat langkah #2 di server.js)
    const file = req.files?.file;
    if (!file) return res.status(400).json({ ok: false, error: "file wajib (form-data key: file)" });

    const marketId = Number(req.query.marketId);
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const truncate = req.query.truncate === "1";
    const dryRun = req.query.dryRun === "1";
    const force = req.query.force === "1";

    if (!marketId) return res.status(400).json({ ok: false, error: "marketId wajib" });

    // baca workbook
    const wb = XLSX.read(file.data, { type: "buffer" });
    const parsed = [];

    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
      if (!aoa.length) continue;

      // deteksi format
      const firstRow = aoa[0].map(x => String(x ?? "").toLowerCase());
      const looksLong =
        firstRow.some(h => HEADER_ALIASES.tanggal.map(slug).includes(slug(h))) &&
        firstRow.some(h => HEADER_ALIASES.komoditas.map(slug).includes(slug(h)));

      const rows = looksLong ? buildFromLong(aoa) : buildFromWide(aoa);
      if (rows?.length) parsed.push(...rows);
    }

    // filter bulan jika dikirim
    const filtered = parsed.filter(r => {
      if (year && String(r.tanggal).slice(0, 4) !== String(year)) return false;
      if (month && String(r.tanggal).slice(5, 7) !== String(month).padStart(2, "0")) return false;
      return true;
    });

    // ambil map komoditas sekali
    const [komList] = await pool.query("SELECT id, nama_komoditas FROM komoditas");
    const komMap = makeKomoditasMap(komList);

    // validasi & tandai anomali ringan
    const anomalies = [];
    const prepared = filtered.map(r => {
      const komId = mapKomoditasId(r.komoditas, komMap);
      const ok = Number.isFinite(r.harga) && r.harga >= 0 && komId != null;
      // contoh aturan anomali sederhana; silakan sesuaikan
      const warn = r.harga > 1000000 || r.harga < 200;
      if (!ok || warn) anomalies.push({ ...r, komoditas_id: komId, reason: ok ? "WARN" : "INVALID" });
      return { ...r, komoditas_id: komId };
    });

    if (dryRun || (!force && anomalies.some(a => a.reason !== "WARN"))) {
      return res.json({
        ok: anomalies.every(a => a.reason === "WARN"),
        preview: true,
        total: prepared.length,
        valid: prepared.length - anomalies.length,
        anomalies,
        sample: prepared.slice(0, 20),
      });
    }

    // opsional: hapus dulu 1 pasar + bulan
    if (truncate && year && month) {
      await pool.query(
        `DELETE FROM laporan_harga
         WHERE market_id = ? AND YEAR(tanggal_lapor)=? AND MONTH(tanggal_lapor)=?`,
        [marketId, year, month]
      );
    }

    // upsert
    let imported = 0, skipped = 0;
    for (const r of prepared) {
      if (!r.komoditas_id || !Number.isFinite(r.harga)) { skipped++; continue; }
      await pool.query(
        `INSERT INTO laporan_harga (market_id, komoditas_id, tanggal_lapor, harga, keterangan)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE harga=VALUES(harga), keterangan=VALUES(keterangan)`,
        [marketId, r.komoditas_id, r.tanggal, r.harga, r.keterangan || null]
      );
      imported++;
    }

    res.json({ ok: true, imported, skipped });
  } catch (e) {
    console.error("[POST /api/import-flex] error:", e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

export default router;
