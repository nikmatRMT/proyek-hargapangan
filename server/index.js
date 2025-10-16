// server/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 4000;

// === Direktori & daftar file Excel ===
const DATA_DIR = path.join(__dirname, 'data');
// Bisa multi baris atau dipisah koma. Default ke 4 file per pasar (2024).
const EXCEL_FILES = (process.env.EXCEL_FILES || `
  pasar-bauntung-2024.xlsx
  pasar-jati-2024.xlsx
  pasar-ulin-raya-2024.xlsx
  pasar-pagi-loktabat-utara-2024.xlsx
`)
  .split(/[\n,]/)
  .map(s => s.trim())
  .filter(Boolean)
  .map(fn => path.join(DATA_DIR, fn));

app.use(cors());
app.use(express.json());

// ===== util =====
const MONTH_MAP = {
  januari: 1, february: 2, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};
const MARKET_SLUG_TO_NAME = {
  bauntung: 'Pasar Bauntung',
  jati: 'Pasar Jati',
  ulin_raya: 'Pasar Ulin Raya',
  loktabat_utara: 'Pasar Pagi Loktabat Utara',
};

let REPORTS = [];
let SCAN_INFO = []; // ringkasan scan untuk debugging

function rowText(row) {
  return (row || [])
    .map((v) => String(v ?? '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function toInt(val) {
  if (val == null || val === '') return null;
  const n = parseInt(String(val).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}
function marketNameFromFilename(filePath) {
  const base = path.basename(filePath, path.extname(filePath)); // tanpa .xlsx
  // ex: pasar-bauntung-2024 ⇒ “Pasar Bauntung”
  const m = base.match(/^pasar-([a-z\- ]+?)(?:-\d{4})?$/i);
  if (m) {
    const part = m[1]
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return `Pasar ${part}`;
  }
  // fallback: judul-case semua
  return base
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// === Parser 1: “terstruktur” (header komoditas + unit + “Pertanggal <Bulan>”) ===
function parseWorkbookStructured(filePath, defaultMarket) {
  const wb = xlsx.readFile(filePath, { cellDates: false, cellNF: false, cellText: false });
  const scans = [];
  const rowsOut = [];

  const sheetNames = wb.SheetNames || [];
  sheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const sheet = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!sheet.length) return;

    // Cari blok judul (baris mengandung “Harga … di Pasar …” atau nama pasar)
    const titleRowIdx = sheet.findIndex((r) => /pasar|harga/i.test(rowText(r)));
    if (titleRowIdx < 0) return;

    // Cari baris “Pertanggal … <bulan>”
    const monthRowIdx = sheet.findIndex((r, i) =>
      i > titleRowIdx && i < titleRowIdx + 20 && /pertanggal/i.test(rowText(r))
    );
    if (monthRowIdx < 0) {
      scans.push({ file: path.basename(filePath), sheet: sheetName, note: 'month row not found' });
      return;
    }

    const monthTxt = rowText(sheet[monthRowIdx]).toLowerCase();
    const monthMatch = monthTxt.match(
      /(januari|februari|february|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/
    );
    const month = monthMatch ? MONTH_MAP[monthMatch[1]] : null;
    if (!month) {
      scans.push({ file: path.basename(filePath), sheet: sheetName, note: 'month not detected' });
      return;
    }

    // Asumsi header komoditas di baris monthRowIdx, unit di baris berikutnya
    const headerRow = sheet[monthRowIdx] || [];
    const unitRow = sheet[monthRowIdx + 1] || [];
    const commodityHeaders = headerRow.slice(3).map((v) => String(v || '').trim());
    const unitHeaders = unitRow.slice(3).map((v) => String(v || '').trim());

    // Data mulai 2 baris setelah monthRowIdx, kolom 2 = tanggal (angka hari)
    for (let r = monthRowIdx + 2; r < sheet.length; r++) {
      const row = sheet[r] || [];
      const day = toInt(row[2]);
      if (!day || day < 1 || day > 31) break;

      // Tentukan tahun dari nama file (…-2024.xlsx). Jika tidak ada, fallback 2024.
      const base = path.basename(filePath);
      const ym = base.match(/(\d{4})/);
      const year = ym ? ym[1] : '2024';
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      for (let c = 0; c < commodityHeaders.length; c++) {
        const commodity = commodityHeaders[c];
        if (!commodity) continue;
        const price = toInt(row[3 + c]);
        if (!price) continue;

        const unitText = (unitHeaders[c] || '').toLowerCase();
        let unit = 'kg';
        if (unitText.includes('liter')) unit = 'liter';
        else if (unitText.includes('kg')) unit = 'kg';

        rowsOut.push({
          id: 0,
          date,
          market_name: defaultMarket,
          commodity_name: commodity,
          unit,
          price,
          user_name: 'import',
          gps_lat: null,
          gps_lng: null,
          photo_url: null,
          notes: null,
        });
      }
    }

    scans.push({
      file: path.basename(filePath),
      sheet: sheetName,
      parsed: rowsOut.length,
      mode: 'structured',
      month,
    });
  });

  return { rows: rowsOut, scans };
}

// === Parser 2: “sederhana” (fallback) ===
// Menganggap kolom: [*, *, Tanggal(hari), Komoditas/Unit..] – dipakai jika format sheet “aneh”.
function parseWorkbookSimple(filePath, defaultMarket) {
  const wb = xlsx.readFile(filePath, { cellDates: false, cellNF: false, cellText: false });
  const scans = [];
  const rowsOut = [];

  const sheetNames = wb.SheetNames || [];
  sheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const sheet = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!sheet.length) return;

    // Cari baris pertama yang terlihat seperti header (ada beberapa isian teks di kanan)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(sheet.length, 20); i++) {
      const t = rowText(sheet[i]).toLowerCase();
      if (/beras|gula|telur|cabe|minyak|ikan/.test(t)) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) return;

    // Unit asumsi di baris berikutnya
    const headerRow = sheet[headerIdx] || [];
    const unitRow = sheet[headerIdx + 1] || [];
    const commodityHeaders = headerRow.slice(3).map((v) => String(v || '').trim());
    const unitHeaders = unitRow.slice(3).map((v) => String(v || '').trim());

    // Cari petunjuk bulan dari salah satu baris awal
    let month = null;
    for (let i = 0; i < Math.min(sheet.length, 10); i++) {
      const t = rowText(sheet[i]).toLowerCase();
      const m = t.match(
        /(januari|februari|february|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/
      );
      if (m) { month = MONTH_MAP[m[1]]; break; }
    }
    if (!month) month = 1;

    const base = path.basename(filePath);
    const ym = base.match(/(\d{4})/);
    const year = ym ? ym[1] : '2024';

    for (let r = headerIdx + 2; r < sheet.length; r++) {
      const row = sheet[r] || [];
      const day = toInt(row[2]);
      if (!day || day < 1 || day > 31) break;

      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      for (let c = 0; c < commodityHeaders.length; c++) {
        const commodity = commodityHeaders[c];
        if (!commodity) continue;
        const price = toInt(row[3 + c]);
        if (!price) continue;

        const unitText = (unitHeaders[c] || '').toLowerCase();
        let unit = 'kg';
        if (unitText.includes('liter')) unit = 'liter';
        else if (unitText.includes('kg')) unit = 'kg';

        rowsOut.push({
          id: 0,
          date,
          market_name: defaultMarket,
          commodity_name: commodity,
          unit,
          price,
          user_name: 'import',
          gps_lat: null,
          gps_lng: null,
          photo_url: null,
          notes: null,
        });
      }
    }

    scans.push({
      file: path.basename(filePath),
      sheet: sheetName,
      parsed: rowsOut.length,
      mode: 'simple',
      month,
    });
  });

  return { rows: rowsOut, scans };
}

function listExcelFiles() {
  return EXCEL_FILES;
}
function loadAllExcels() {
  SCAN_INFO = [];
  const files = listExcelFiles();
  const allRows = [];
  const summaryPerFile = {};

  files.forEach(filePath => {
    const marketName = marketNameFromFilename(filePath);
    const a = parseWorkbookStructured(filePath, marketName);
    const used = a.rows.length ? a : parseWorkbookSimple(filePath, marketName);
    used.rows.forEach(r => allRows.push(r));
    used.scans.forEach(s => SCAN_INFO.push(s));
    summaryPerFile[path.basename(filePath)] = used.rows.length;
  });

  REPORTS = allRows
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((r, i) => ({ ...r, id: i + 1 }));

  const perMarket = REPORTS.reduce((acc, r) => {
    acc[r.market_name] = (acc[r.market_name] || 0) + 1;
    return acc;
  }, {});

  console.log(`[excel] loaded ${REPORTS.length} rows from ${files.length} file(s).`);
  console.log('[excel] rows per file:', summaryPerFile);
  console.log('[excel] rows per market:', perMarket);
}

// ==== SSE (Server-Sent Events) untuk live update ====
const sseClients = new Set();
function broadcast(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const { res } of sseClients) res.write(payload);
}
setInterval(() => {
  for (const { res } of sseClients) res.write(`: ping\n\n`);
}, 25000);
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*', // beda origin (tunnel) aman
  });
  res.flushHeaders?.();
  res.write('retry: 5000\n\n');
  const client = { res };
  sseClients.add(client);
  req.on('close', () => sseClients.delete(client));
});

// ========= Routes =========
app.get('/', (_, res) => res.send('DKP3 API OK'));
app.get('/health', (_, res) => res.json({ status: 'ok', rows: REPORTS.length }));

// debug
app.get('/_debug/scan', (_, res) => res.json(SCAN_INFO));
app.get('/_debug/markets', (_, res) => {
  const m = REPORTS.reduce((a, r) => {
    a[r.market_name] = (a[r.market_name] || 0) + 1;
    return a;
  }, {});
  res.json(m);
});
app.get('/_debug/first', (req, res) => {
  const n = parseInt(String(req.query.limit || 20), 10);
  res.json(REPORTS.slice(0, Number.isFinite(n) ? n : 20));
});

// GET /reports?from=YYYY-MM-DD&to=YYYY-MM-DD&market=bauntung|jati|ulin_raya|loktabat_utara
// Atau gunakan year & month: /reports?year=2024&month=8
app.get('/reports', (req, res) => {
  const { from, to, market, year, month } = req.query;
  let rows = REPORTS.slice();

  if (year && month) {
    const y = String(year).padStart(4, '0');
    const m = String(month).padStart(2, '0');
    const last = new Date(Number(y), Number(m), 0).getDate();
    const start = `${y}-${m}-01`;
    const end = `${y}-${m}-${String(last).padStart(2, '0')}`;
    rows = rows.filter(r => r.date >= start && r.date <= end);
  } else {
    if (from) rows = rows.filter(r => r.date >= String(from));
    if (to)   rows = rows.filter(r => r.date <= String(to));
  }

  if (market) {
    const target = (MARKET_SLUG_TO_NAME[String(market)] || String(market)).toLowerCase();
    rows = rows.filter(r => (r.market_name || '').toLowerCase() === target);
  }

  res.json(rows);
});

// Range tanggal (untuk inisialisasi filter di web-admin)
app.get('/reports/range', (_, res) => {
  const dates = REPORTS.map(r => r.date).filter(Boolean).sort();
  res.json({ min: dates[0] || null, max: dates[dates.length - 1] || null });
});

// POST /reports — simpan ke memori, paling atas, dan broadcast ke SSE
app.post('/reports', (req, res) => {
  const {
    date, market_name, commodity_name, unit, price,
    user_name, gps_lat, gps_lng, photo_url, notes, keterangan,
  } = req.body || {};

  if (!date || !market_name || !commodity_name || !unit || typeof price !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const row = {
    id: REPORTS.length ? (REPORTS[0].id || 0) + 1 : 1,
    date,
    market_name,
    commodity_name,
    unit,
    price,
    user_name: user_name || 'Anon',
    gps_lat: gps_lat ?? null,
    gps_lng: gps_lng ?? null,
    photo_url: photo_url ?? null,
    notes: (notes ?? keterangan) || null,
    created_at: new Date().toISOString(),
  };

  REPORTS.unshift(row);             // tampil paling atas
  broadcast('report-created', row); // kabari klien

  res.status(201).json(row);
});

// start
try {
  loadAllExcels();
} catch (e) {
  console.warn('[excel] load error:', e?.message || e);
  REPORTS = [];
}
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
