// server/excel.js
const XLSX = require('xlsx');
const dayjs = require('dayjs');

const HEADER_ALIASES = {
  date: ['tanggal','tgl','date'],
  market_name: ['pasar','lokasi','market'],
  commodity_name: ['komoditas','komoditi','barang','commodity'],
  unit: ['satuan','unit'],
  price: ['harga','price'],
  user_name: ['petugas','petugas lapangan','user','nama petugas'],
  gps_lat: ['lat','latitude','gps_lat'],
  gps_lng: ['lng','longitude','gps_lng'],
  photo_url: ['foto','photo','photo_url'],
};

const norm = v => String(v ?? '').trim().toLowerCase();

function findCols(headers) {
  const h = headers.map(norm);
  const map = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = h.findIndex(x => aliases.includes(x));
    if (idx !== -1) map[key] = idx;
  }
  return map;
}

const parsePrice = v => {
  const s = String(v ?? '').replace(/[^\d]/g, '');
  return s ? Number(s) : null;
};

function loadReportsFromExcel(filePath, sheetName) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const name = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet "${name}" tidak ditemukan`);

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (rows.length < 2) return [];

  const headers = rows[0];
  const col = findCols(headers);

  const data = [];
  let id = 1;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const d = r[col.date];
    const date = d instanceof Date
      ? dayjs(d).format('YYYY-MM-DD')
      : dayjs(String(d)).isValid() ? dayjs(String(d)).format('YYYY-MM-DD') : null;

    const price = parsePrice(r[col.price]);
    if (!date || price == null) continue;

    data.push({
      id: id++,
      date,
      market_name: r[col.market_name] ?? '',
      commodity_name: r[col.commodity_name] ?? '',
      unit: (r[col.unit] ?? 'kg').toString(),
      price,
      user_name: r[col.user_name] ?? 'Anon',
      gps_lat: col.gps_lat != null ? Number(r[col.gps_lat]) : null,
      gps_lng: col.gps_lng != null ? Number(r[col.gps_lng]) : null,
      photo_url: col.photo_url != null ? String(r[col.photo_url]) : null,
    });
  }
  return data;
}

function appendReportToExcel(filePath, row, sheetName) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const name = sheetName || wb.SheetNames[0];
  let ws = wb.Sheets[name];
  if (!ws) { ws = XLSX.utils.aoa_to_sheet([]); wb.Sheets[name] = ws; if (!wb.SheetNames.includes(name)) wb.SheetNames.push(name); }

  // Asumsi header minimum: Tanggal, Pasar, Komoditas, Satuan, Harga, Petugas, GPS_Lat, GPS_Lng, Foto
  const headers = ['Tanggal','Pasar','Komoditas','Satuan','Harga','Petugas','GPS_Lat','GPS_Lng','Foto'];
  if (!ws['!ref']) XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });

  const next = (XLSX.utils.decode_range(ws['!ref']).e.r || 0) + 2; // baris berikutnya (1-based)
  const newRow = [row.date, row.market_name, row.commodity_name, row.unit, row.price, row.user_name, row.gps_lat, row.gps_lng, row.photo_url];
  XLSX.utils.sheet_add_aoa(ws, [newRow], { origin: `A${next}` });

  XLSX.writeFile(wb, filePath);
}

module.exports = { loadReportsFromExcel, appendReportToExcel };
