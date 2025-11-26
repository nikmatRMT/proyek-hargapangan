// src/lib/excel.mjs
import XLSX from "xlsx";

/* ======================
 *  Nama bulan & util
 * ====================== */
export const ID_MONTHS = [
  "januari","februari","maret","april","mei","juni",
  "juli","agustus","september","oktober","november","desember"
];

function monthNumberFromName(s = "") {
  const low = String(s).toLowerCase();
  for (let i = 0; i < ID_MONTHS.length; i++) {
    if (low.includes(ID_MONTHS[i])) return i + 1;
  }
  // fallback angka 1..12 yang berdiri sendiri
  const m = low.match(/\b(1[0-2]|0?[1-9])\b/);
  return m ? Number(m[1]) : null;
}

export function guessYearFromFilename(name = "") {
  const m = String(name).match(/\b(20\d{2}|19\d{2})\b/);
  return m ? Number(m[1]) : null;
}

export function weekRomanForDay(day) {
  const idx = Math.floor((day - 1) / 7);
  return ["I", "II", "III", "IV", "V"][Math.min(Math.max(idx, 0), 4)];
}

function ymd(y, m, d) {
  const dt = new Date(y, m - 1, d);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/* ======================
 *  Normalisasi komoditas
 * ====================== */
const UNIT_RE =
  /^\(?\s*rp\.?\s*[/\s]*\s*(kg|kilogram|liter|ltr|l)\s*\)?$/i;
const UNIT_SUFFIX_RE =
  /\s*\(\s*rp\.?\s*[/\s]*\s*(kg|kilogram|liter|ltr|l)\s*\)\s*$/i;

function toStr(v) { return v == null ? "" : String(v).trim(); }
function stripUnitSuffix(s) { return toStr(s).replace(UNIT_SUFFIX_RE, "").trim(); }
function onlyUnit(s) { return UNIT_RE.test(toStr(s)); }
function hasLetters(s) { return /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/.test(toStr(s)); }

export function normCommodityName(input) {
  if (input == null) return "";
  let s = String(input).normalize("NFKC");

  // buang unit/embel-embel di belakang nama
  s = s.replace(UNIT_SUFFIX_RE, "");
  s = s.replace(/\bRp\.?\s*[/\s]*(kg|kilogram|liter|ltr|l)\b/ig, "");
  s = s.replace(/\b(kg|kilogram|liter|ltr|l)\b/ig, "");

  // rapikan spasi & slash
  s = s.replace(/\s*\/\s*/g, "/");
  s = s.replace(/\s+/g, " ").trim();

  // header umum yang bukan komoditas
  const IGNORE = /^(komoditas|jenis|nama komoditas|harga|tanggal|tgl|pertanggal|keterangan)$/i;
  if (!s || IGNORE.test(s)) return "";

  // alias populer
  const alias = {
    "cabai rawit": "cabe rawit",
    "cabai merah besar": "cabe merah besar",
    "ikan haruan / gabus": "ikan haruan/ gabus",
    "ikan haruan/gabus": "ikan haruan/ gabus",
    "ikan tongkol / tuna": "ikan tongkol/tuna",
    "ikan mas / nila": "ikan mas/nila",
    "ikan kembung / pindang": "ikan kembung/pindang",
  };

  const low = s.toLowerCase();
  return alias[low] || low;
}

/* ======================
 *  Parse angka harga
 * ====================== */
function parseHarga(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v);
  const digits = String(v).replace(/[^\d.-]/g, "");
  if (!digits || digits === "-") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/* ======================
 *  Deteksi bulan/tahun
 * ====================== */
function detectMonthAndYear(ws, sheetName = "", fallbackYear = null) {
  let month = monthNumberFromName(sheetName);
  let year = fallbackYear;

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false });
  const headCells = rows.slice(0, 25).flat().filter(Boolean).map(String);

  if (month == null) {
    for (const t of headCells) {
      const m = monthNumberFromName(t);
      if (m) { month = m; break; }
    }
  }
  if (!year) {
    for (const t of headCells) {
      const y = t.match(/\b(20\d{2}|19\d{2})\b/);
      if (y) { year = Number(y[1]); break; }
    }
  }

  // fallback dari sel tanggal excel
  outer:
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    for (let c = 0; c < Math.min(rows[r].length, 12); c++) {
      const v = rows[r][c];
      if (v instanceof Date && !isNaN(v)) {
        month ??= v.getMonth() + 1;
        year ??= v.getFullYear();
        break outer;
      }
      if (typeof v === "number" && v > 20000 && v < 60000) {
        const d = XLSX.SSF.parse_date_code(v);
        if (d) { month ??= d.m; year ??= d.y; break outer; }
      }
      if (typeof v === "string") {
        const m = v.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](19|20)\d{2}/);
        if (m) { month ??= Number(m[2]); year ??= Number(m[3] + v.slice(m.index + m[0].length - 2, m.index + m[0].length)); break outer; }
      }
    }
  }

  return { month, year };
}

/* ======================
 *  Parser WIDE (export)
 *  header: (kadang 2 baris)  [judul bulan],  [Nama Komoditas...]
 *  baris unit: (Rp/Kg) / (Rp/Liter)
 * ====================== */
function parseWide(ws, { year, month }) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false });
  if (!rows.length) return { items: [] };

  // 1) Temukan kandidat baris header/units
  let headerRow = -1;
  let unitsRow = -1;
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r] || [];
    const unitCount = row.filter((x) => onlyUnit(x)).length;
    const hasManyNames = row.filter((x) => hasLetters(x) && !onlyUnit(x)).length >= 3;
    if (unitCount >= 3) { unitsRow = r; }
    if (hasManyNames)  { headerRow = r; break; }
  }

  // 2) Jika belum dapat nama kolom yang cukup, coba "angkat" dari atas/bawah baris units
  if (headerRow < 0 && unitsRow >= 0) {
    const up = rows[unitsRow - 1] || [];
    const down = rows[unitsRow + 1] || [];
    const upNames   = up.filter((x) => hasLetters(x) && !onlyUnit(x)).length;
    const downNames = down.filter((x) => hasLetters(x) && !onlyUnit(x)).length;
    if (upNames >= 3) headerRow = unitsRow - 1;
    else if (downNames >= 3) headerRow = unitsRow + 1;
  }

  if (headerRow < 0) return { items: [] };

  // 3) Tentukan index kolom tanggal:
  //    - Jika ada header 'Tanggal'/'Tgl' pakai itu
  //    - Jika tidak ada, asumsi layout export: kolom 1 = minggu romawi, kolom 2 = hari (1..31)
  const header = (rows[headerRow] || []).map(toStr);
  let colTanggal = header.findIndex((h) => /^tgl$|^tanggal$|^date$/i.test(h));
  if (colTanggal < 0) colTanggal = 2; // asumsi file export: kolom ke-3 berisi "hari"

  // 4) Kumpulkan kolom komoditas dari baris header (dengan fallback ke atas/bawah jika kosong/berisi unit)
  const pickHeaderAt = (c) => {
    const cur = header[c];
    if (cur && !onlyUnit(cur) && hasLetters(cur)) return cur;
    const above = rows[headerRow - 1]?.[c];
    if (above && !onlyUnit(above) && hasLetters(above)) return above;
    const below = rows[headerRow + 1]?.[c];
    if (below && !onlyUnit(below) && hasLetters(below)) return below;
    return cur;
  };

  let commodityCols = [];
  for (let c = 0; c < header.length; c++) {
    if (c === colTanggal) continue;       // lewati kolom tanggal
    if (c === 1) continue;                // lewati kolom minggu romawi (layout export)
    const key = normCommodityName(stripUnitSuffix(pickHeaderAt(c)));
    if (!key) continue;
    commodityCols.push({ c, key });
  }

  // Bila deteksi masih terlalu sedikit (misal hanya 1), anggap bukan format wide
  if (commodityCols.length < 2) return { items: [] };

  // 5) Iterasi data
  const items = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((v) => v == null || v === "")) continue;

    // tanggal (menerima serial Excel, angka hari, atau dd/mm/yyyy)
    let iso = null;
    const cell = row[colTanggal];

    if (cell instanceof Date && !isNaN(cell)) {
      iso = ymd(cell.getFullYear() || year, (cell.getMonth() + 1) || month, cell.getDate());
    } else if (typeof cell === "number") {
      if (cell > 20000 && cell < 60000) {
        const d = XLSX.SSF.parse_date_code(cell);
        if (d) iso = ymd(d.y || year, d.m || month, d.d);
      } else if (cell >= 1 && cell <= 31) {
        iso = ymd(year, month, cell);
      }
    } else if (typeof cell === "string") {
      const s = cell.trim();
      if (/^\d{1,2}$/.test(s)) {
        iso = ymd(year, month, Number(s));
      } else {
        const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]((?:19|20)\d{2})/);
        if (m) iso = ymd(Number(m[3]), Number(m[2]), Number(m[1]));
      }
    }
    if (!iso) continue;

    for (const { c, key } of commodityCols) {
      const harga = parseHarga(row[c]);
      if (harga == null) continue;
      items.push({ tanggal_lapor: iso, komoditas_nama: key, harga });
    }
  }

  return { items };
}

/* ======================
 *  Parser TALL (manual)
 *  kolom minimal: Tanggal | Komoditas | Harga
 * ====================== */
function parseTall(ws, { year, month }) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false });
  if (!rows.length) return { items: [] };

  // cari header
  let hdrIdx = -1, colTgl=-1, colKom=-1, colHarga=-1;
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r].map(toStr);
    const idxT = row.findIndex((x) => /^tgl$|^tanggal$|^date$/i.test(x));
    const idxK = row.findIndex((x) => /komoditas|commodity|nama komoditas/i.test(x));
    const idxH = row.findIndex((x) => /^harga|^price/i.test(x));
    if (idxT >= 0 && idxK >= 0 && idxH >= 0) {
      hdrIdx = r; colTgl=idxT; colKom=idxK; colHarga=idxH; break;
    }
  }
  if (hdrIdx === -1) return { items: [] };

  const items = [];
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const nama = normCommodityName(row[colKom]);
    if (!nama) continue;

    const harga = parseHarga(row[colHarga]);
    if (harga == null) continue;

    let iso = null, cell = row[colTgl];
    if (cell instanceof Date && !isNaN(cell)) {
      iso = ymd(cell.getFullYear() || year, (cell.getMonth() + 1) || month, cell.getDate());
    } else if (typeof cell === "number" && cell > 20000 && cell < 60000) {
      const d = XLSX.SSF.parse_date_code(cell);
      if (d) iso = ymd(d.y || year, d.m || month, d.d);
    } else if (typeof cell === "number" && cell >= 1 && cell <= 31) {
      iso = ymd(year, month, cell);
    } else if (typeof cell === "string") {
      const s = cell.trim();
      if (/^\d{1,2}$/.test(s)) iso = ymd(year, month, Number(s));
      const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]((?:19|20)\d{2})/);
      if (m) iso = ymd(Number(m[3]), Number(m[2]), Number(m[1]));
    }
    if (!iso) continue;

    items.push({ tanggal_lapor: iso, komoditas_nama: nama, harga });
  }
  return { items };
}

/* ======================
 *  Entry point parser 1 sheet
 *  Otomatis: coba WIDE → TALL
 * ====================== */
export function parseMonthlySheet(ws, { year, sheetName = "" } = {}) {
  const meta = detectMonthAndYear(ws, sheetName, year);
  if (!meta.month || !meta.year) return { month: null, items: [] };

  // 1) coba wide (aman utk file Export)
  const wide = parseWide(ws, meta);
  if (wide.items.length) return { month: meta.month, items: wide.items };

  // 2) fallback ke tall (file lama/manual)
  const tall = parseTall(ws, meta);
  if (tall.items.length) return { month: meta.month, items: tall.items };

  return { month: meta.month, items: [] };
}

/* ======================
 *  Builder export (tetap kompatibel)
 * ====================== */
export function buildExampleWorkbook({ title, month, data, commodityOrder, unitsMap }) {
  const wb = XLSX.utils.book_new();
  const sheet = [];

  // row 0-1 judul/kosong
  sheet.push([title]);
  sheet.push([]);

  // row 2 header: "Juli Pertanggal" di kolom B, komoditas mulai kolom D
  const mName = ID_MONTHS[month - 1] || String(month);
  const cap = mName.charAt(0).toUpperCase() + mName.slice(1);
  const line2 = [];
  line2[1] = `${cap} Pertanggal`; // B
  const startCol = 3;             // D
  commodityOrder.forEach((nm, i) => (line2[startCol + i] = nm));
  sheet.push(line2);

  // row 3 unit
  const line3 = [];
  commodityOrder.forEach((nm, i) => (line3[startCol + i] = unitsMap?.[nm] || "(Rp/Kg)"));
  sheet.push(line3);

  // data per tanggal
  const byDate = new Map();
  for (const r of data) {
    if (!byDate.has(r.tanggal)) byDate.set(r.tanggal, new Map());
    byDate.get(r.tanggal).set(r.komoditas, r.harga ?? "");
  }
  const dates = Array.from(byDate.keys()).sort();

  for (const d of dates) {
    const day = Number(d.slice(-2));
    const row = [];
    row[1] = [1, 8, 15, 22, 29].includes(day) ? weekRomanForDay(day) : ""; // B
    row[2] = day;                                                          // C
    commodityOrder.forEach((nm, i) => (row[startCol + i] = byDate.get(d).get(nm) ?? ""));
    sheet.push(row);
  }

  // baris rata-rata
  const avg = [];
  avg[1] = "Rata-Rata";
  commodityOrder.forEach((nm, i) => {
    const vals = dates.map(d => byDate.get(d).get(nm)).filter(v => typeof v === "number");
    avg[startCol + i] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : "";
  });
  sheet.push(avg);

  const ws = XLSX.utils.aoa_to_sheet(sheet);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
}

export default {
  parseMonthlySheet,
  guessYearFromFilename,
  normCommodityName,
  weekRomanForDay,
  buildExampleWorkbook,
  ID_MONTHS
};
