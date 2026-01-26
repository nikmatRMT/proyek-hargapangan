
// src/utils/exportExcel.ts

/** Loader exceljs yang aman di browser (Vite) */
export async function loadWorkbookCtor(): Promise<new () => any> {
  // Coba browser build dulu (paling stabil untuk bundler)
  try {
    const mod: any = await import('exceljs/dist/exceljs.min.js');
    const Excel = mod?.default ?? mod;
    if (Excel?.Workbook) return Excel.Workbook as new () => any;
  } catch { }
  // Fallback ke paket utama
  try {
    const mod: any = await import('exceljs');
    const Excel = mod?.default ?? mod;
    if (Excel?.Workbook) return Excel.Workbook as new () => any;
  } catch { }
  throw new Error(
    "Tidak bisa memuat exceljs. Pastikan paket 'exceljs' terpasang & bundler tidak mem-pollyfill Node core."
  );
}

/** Tipe baris yang dipakai writer */
export type MarketRow = {
  week?: string;
  day?: number;
  // dynamic commodity columns: key=commodity name, value=number
  [commodity: string]: any;
};

const DEFAULT_HEADER_COMMODITIES = [
  'Beras',
  'Minyak Goreng Kemasan',
  'Minyak Goreng Curah',
  'Tepung Terigu Kemasan',
  'Tepung Terigu Curah',
  'Gula Pasir',
  'Telur Ayam',
  'Daging Sapi',
  'Daging Ayam',
  'Kedelai',
  'Bawang Merah',
  'Bawang Putih',
  'Cabe Merah Besar',
  'Cabe Rawit',
  'Ikan Haruan/ Gabus',
  'Ikan Tongkol/Tuna',
  'Ikan Mas/Nila',
  'Ikan Patin',
  'Ikan Papuyu/Betok',
  'Ikan Bandeng',
  'Ikan Kembung/Pindang',
];

const DEFAULT_UNIT = '(Rp/Kg)';

/** ubah px → lebar karakter (ExcelJS) */
function setColumnWidthPx(ws: any, col: number, px: number) {
  const width = Math.max(0, (px - 5) / 7);
  ws.getColumn(col).width = Math.round(width * 100) / 100;
}

// Helper to sanitize sheet name (Excel limit 31 chars, remove invalid chars)
function safeSheetName(n: string) {
  const cleaned = String(n || '').replace(/[:\\\/\?\*\[\]]/g, '');
  return cleaned.trim().slice(0, 31) || 'Sheet';
}

/** Core: tulis 1 tabel ke worksheet, ditempel di bawah baris terakhir yang ada */
function writeTableToWorksheet(
  ws: any,
  opts: { title: string; monthLabel: string; rows: MarketRow[]; headers?: string[]; units?: string[] },
  startRow: number = 1
) {
  const { title, monthLabel, rows = [], headers = DEFAULT_HEADER_COMMODITIES, units = [] } = opts;

  // layout kolom (dynamic end column)
  const startCol = 4;
  const endCol = 3 + headers.length; // columns: 1..3 + headers
  setColumnWidthPx(ws, 1, 5); // A spacer
  setColumnWidthPx(ws, 2, 70); // Minggu
  setColumnWidthPx(ws, 3, 90); // Tanggal
  for (let i = 0; i < headers.length; i++) setColumnWidthPx(ws, startCol + i, 94);

  // ===== Judul (merge A..endCol) starting at startRow
  const curLast = ws.lastRow ? ws.lastRow.number : 0;
  for (let r = curLast + 1; r <= startRow - 1; r++) ws.addRow([]);
  const titleRow: any = ws.addRow([]);
  titleRow.height = 26;
  const titleCell: any = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells(titleRow.number, 1, titleRow.number, endCol);

  // ===== Header & Unit
  const headerRow: any = ws.addRow(['', 'Minggu', 'Tanggal', ...headers]);
  const unitVals: any[] = Array(3 + headers.length).fill('');
  unitVals[2] = monthLabel; // kolom C
  for (let i = 0; i < headers.length; i++) unitVals[3 + i] = units[i] || DEFAULT_UNIT;
  const unitsRow: any = ws.addRow(unitVals);

  // Merge B(header) 2 baris (Minggu)
  ws.mergeCells(headerRow.number, 2, unitsRow.number, 2);
  // Freeze panes so header rows remain visible
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: unitsRow.number }];

  const borderThin = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
  };

  headerRow.eachCell((cell: any, col: number) => {
    if (col === 1) return;
    cell.font = { name: 'Arial', bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = borderThin;
  });

  unitsRow.eachCell((cell: any, col: number) => {
    if (col === 1) return;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
  });

  // ===== Data (mulai baris berikutnya)
  // Helper: sanitize number values (0 if invalid)
  const safeNum = (val: any): number => {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const toRow = (r: MarketRow): (string | number)[] => [
    '',
    String(r.week || ''),
    safeNum(r.day),
    safeNum(r.beras), safeNum(r.minyakGorengKemasan), safeNum(r.minyakGorengCurah),
    safeNum(r.tepungTeriguKemasan), safeNum(r.tepungTeriguCurah), safeNum(r.gulaPasir),
    safeNum(r.telurAyam), safeNum(r.dagingSapi), safeNum(r.dagingAyam),
    safeNum(r.kedelai), safeNum(r.bawangMerah), safeNum(r.bawangPutih),
    safeNum(r.cabeMerahBesar), safeNum(r.cabeRawit),
    safeNum(r.ikanHaruan), safeNum(r.ikanTongkol), safeNum(r.ikanMas),
    safeNum(r.ikanPatin), safeNum(r.ikanPapuyu), safeNum(r.ikanBandeng), safeNum(r.ikanKembung),
  ];

  const firstDataRowIdx = ws.lastRow.number + 1;
  for (const r of rows) {
    // build row according to headers
    const dynamicVals: (string | number)[] = headers.map((h) => {
      const v = r[h];
      const n = Number(v);
      return Number.isFinite(n) ? n : '';
    });
    const rowVals = ['', String(r.week || ''), safeNum(r.day), ...dynamicVals];
    const row: any = ws.addRow(rowVals);
    row.eachCell((cell: any, col: number) => {
      if (col === 1) return;
      const isWeekCell = col === 2 && !!r.week;
      cell.font = { name: isWeekCell ? 'Arial' : 'Roboto', bold: isWeekCell };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
      // Only apply number format if value is valid number
      if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
        cell.numFmt = '#,##0';
      }
    });
  }

  if (rows.length === 0) { ws.addRow([]); return; }

  // Merge kolom B (Minggu) per blok 7 hari, berdasarkan day
  let i = 0;
  while (i < rows.length) {
    const w = Math.floor((rows[i].day - 1) / 7);
    let j = i + 1;
    while (j < rows.length && Math.floor((rows[j].day - 1) / 7) === w) j++;
    const rStart = firstDataRowIdx + i;
    const rEnd = firstDataRowIdx + j - 1;
    if (rEnd >= rStart) {
      ws.mergeCells(rStart, 2, rEnd, 2);
      const c: any = ws.getCell(rStart, 2);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.font = { name: 'Arial', bold: true };
    }
    i = j;
  }

  // ===== Rata-Rata (pakai baris yang punya label minggu)
  const weekRows = rows.filter((r) => r.week && r.week.trim() !== '');
  const avg = (k: keyof MarketRow) => {
    const nums = weekRows.map((r) => Number(r[k] ?? 0)).filter(n => Number.isFinite(n) && n >= 0);
    if (nums.length === 0) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  };

  const avgRow: any = ws.addRow([
    '', 'Rata-Rata', '',
    avg('beras'), avg('minyakGorengKemasan'), avg('minyakGorengCurah'), avg('tepungTeriguKemasan'),
    avg('tepungTeriguCurah'), avg('gulaPasir'), avg('telurAyam'), avg('dagingSapi'), avg('dagingAyam'),
    avg('kedelai'), avg('bawangMerah'), avg('bawangPutih'), avg('cabeMerahBesar'), avg('cabeRawit'),
    avg('ikanHaruan'), avg('ikanTongkol'), avg('ikanMas'), avg('ikanPatin'), avg('ikanPapuyu'), avg('ikanBandeng'), avg('ikanKembung'),
  ]);

  const greyFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD6DCE4' } };
  avgRow.eachCell((cell: any, col: number) => {
    if (col === 1) return;
    cell.font = { name: 'Roboto', bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'medium' as const },
      right: { style: 'thin' as const },
    };
    // Validate number before applying format
    if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
      cell.numFmt = '#,##0';
    }
    cell.fill = greyFill;
  });
  ws.mergeCells(avgRow.number, 2, avgRow.number, 3);
  const avgMerged: any = ws.getCell(avgRow.number, 2);
  avgMerged.alignment = { horizontal: 'center', vertical: 'middle' };
  avgMerged.font = { name: 'Roboto', bold: true };
  avgMerged.fill = greyFill;

  // Spacer antar tabel
  ws.addRow([]);
}

/** Helper simpan blob ke file */
function saveBlob(blob: Blob, fileName: string) {
  const safe = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: safe });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export SINGLE sheet (1 tabel) */
export async function exportMarketExcel(opts: {
  title: string; monthLabel: string; rows: MarketRow[]; fileName?: string; headers?: string[]; units?: string[]; marketName?: string; marketAddress?: string;
}) {
  const Workbook = await loadWorkbookCtor();
  const wb: any = new Workbook();

  // Set workbook properties untuk avoid Excel warning
  wb.creator = 'HARPA BANUA';
  wb.lastModifiedBy = 'HARPA BANUA';
  wb.created = new Date();
  wb.modified = new Date();
  wb.lastPrinted = new Date();

  // Use legacy single-sheet name exactly as the sample writer
  const sheetName = 'Sheet1';
  console.log('[exportMarketExcel] creating sheet (legacy):', sheetName, 'fileName:', opts.fileName);
  const ws = wb.addWorksheet(sheetName, {
    properties: { tabColor: { argb: 'FF00FF00' } },
    views: [{ state: 'normal' }]
  });

  // Tambahkan nama pasar dan alamat pasar di atas judul
  // Baris 1: Judul utama (merge penuh)
  ws.addRow([opts.title || '']);
  ws.getRow(1).font = { name: 'Arial', size: 14, bold: true };
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells(1, 1, 1, 24);
  // Baris 2: Nama Pasar — tulis di kolom B supaya terlihat (kolom A dipakai spacer)
  ws.addRow(['', `Nama Pasar: ${opts.marketName || '-'}`]);
  const nameRow = ws.getRow(2);
  nameRow.getCell(2).font = { name: 'Arial', size: 12, bold: true };
  nameRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells(2, 2, 2, 24);
  // Baris 3: Alamat Pasar — tulis di kolom B dan merge ke kanan
  let alamat = '-';
  if (typeof opts.marketAddress !== 'undefined') {
    alamat = opts.marketAddress && opts.marketAddress.trim() ? opts.marketAddress : '-';
  }
  ws.addRow(['', `Alamat Pasar: ${alamat}`]);
  const addrRow = ws.getRow(3);
  addrRow.getCell(2).font = { name: 'Arial', size: 12 };
  addrRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.mergeCells(3, 2, 3, 24);
  // Baris 4: kosong (spasi)
  ws.addRow(['']);
  // Pastikan tidak ada merge di baris 2 dan 3
  // Mulai tabel di baris 5
  writeTableToWorksheet(ws, { ...opts, title: '' }, 5);

  // Explicitly clear views and autoFilter
  ws.views = [{ state: 'normal', showGridLines: true }];
  delete (ws as any).autoFilter;
  ws.autoFilter = null;

  const buf = await wb.xlsx.writeBuffer();                 // ArrayBuffer | Buffer
  const arrayBuffer: ArrayBuffer =
    buf instanceof ArrayBuffer ? buf : (buf as any).buffer;
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveBlob(blob, opts.fileName ?? 'laporan-harga.xlsx');
}

/** Export SINGLE sheet berisi ≤12 tabel bulanan (ditumpuk ke bawah) */
export async function exportMonthsStackedSingleSheet(params: {
  tables: Array<{ title: string; monthLabel: string; rows: MarketRow[] }>;
  fileName?: string;
}) {
  const { tables, fileName = 'semua-pasar_stacked.xlsx' } = params;
  const Workbook = await loadWorkbookCtor();
  const wb: any = new Workbook();

  // Set workbook properties
  wb.creator = 'HARPA BANUA';
  wb.lastModifiedBy = 'HARPA BANUA';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Semua Pasar', {
    views: [{ state: 'normal' }]
  });

  for (const t of tables) writeTableToWorksheet(ws, t);

  ws.views = [{ state: 'normal', showGridLines: true }];
  delete (ws as any).autoFilter;
  ws.autoFilter = null;
  delete (ws as any).autoFilter;

  const buf = await wb.xlsx.writeBuffer();
  const arrayBuffer: ArrayBuffer =
    buf instanceof ArrayBuffer ? buf : (buf as any).buffer;
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveBlob(blob, fileName);
}

/** Export: one worksheet per market. Each worksheet contains stacked monthly tables for that market. */
export async function exportMarketsMultiSheet(params: {
  markets: Array<{ name: string; tables: Array<{ title: string; monthLabel: string; rows: MarketRow[]; headers?: string[]; units?: string[] }> }>;
  fileName?: string;
}) {
  const { markets, fileName = 'semua-pasar-multi-sheet.xlsx' } = params;
  const Workbook = await loadWorkbookCtor();
  const wb: any = new Workbook();

  wb.creator = 'HARPA BANUA';
  wb.lastModifiedBy = 'HARPA BANUA';
  wb.created = new Date();
  wb.modified = new Date();

  for (const m of markets) {
    const sheetName = safeSheetName(m.name);
    console.log('[exportMarketsMultiSheet] creating sheet:', sheetName, 'for market:', m.name);
    const ws = wb.addWorksheet(sheetName, { views: [{ state: 'normal' }] });
    // write each table into this worksheet stacked
    for (const t of m.tables) {
      // t may include headers/units; pass through
      writeTableToWorksheet(ws, { title: t.title, monthLabel: t.monthLabel, rows: t.rows, headers: t.headers, units: t.units });
    }
  }

  console.log('[exportMarketsMultiSheet] writing workbook with', markets.length, 'sheets, filename=', fileName);
  // finalize
  const buf = await wb.xlsx.writeBuffer();
  const arrayBuffer: ArrayBuffer = buf instanceof ArrayBuffer ? buf : (buf as any).buffer;
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveBlob(blob, fileName);
}

// Add runtime logs to single-sheet export for easier debugging in browser
// (keeps behavior unchanged but prints useful info)
// Note: this log helps verify which title/filename is used.

/** 
 * Export Specific Commodity Layout (Multi-column: 1-10, 11-20, 21-30) 
 * Layout:
 * Header (merged): Market Name
 * Header (merged): Address
 * Header (merged): "Harga [Commodity]"
 * Columns: [Tanggal | Harga] [Tanggal | Harga] [Tanggal | Harga] [Tanggal | Harga]
 *          (Days 1-10)      (Days 11-20)     (Days 21-30)     (Day 31)
 */
export async function exportCommodityExcel(opts: {
  marketName: string;
  marketAddress: string;
  commodityName: string; // e.g. "Beras"
  rows: MarketRow[]; // Expected to be 1 month of data
  fileName?: string;
}) {
  const { marketName, marketAddress, commodityName, rows, fileName } = opts;
  const Workbook = await loadWorkbookCtor();
  const wb: any = new Workbook();

  wb.creator = 'HARPA BANUA';
  wb.lastModifiedBy = 'HARPA BANUA';
  wb.created = new Date();
  wb.modified = new Date();

  const sheetName = 'Sheet1';
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'normal', showGridLines: true }]
  });

  // --- Headers ---
  // Row 1: Market Name
  ws.addRow([marketName]);
  ws.mergeCells(1, 1, 1, 8); // Merge A-H (4 pairs of columns = 8 cols)
  const r1 = ws.getRow(1);
  r1.height = 25;
  r1.getCell(1).font = { name: 'Arial', size: 14, bold: true };
  r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 2: Address
  ws.addRow([marketAddress || '-']);
  ws.mergeCells(2, 1, 2, 8);
  const r2 = ws.getRow(2);
  r2.getCell(1).font = { name: 'Arial', size: 11 };
  r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Row 3: Title "Harga [Commodity]"
  ws.addRow([`Harga ${commodityName}`]);
  ws.mergeCells(3, 1, 3, 8);
  const r3 = ws.getRow(3);
  r3.height = 20;
  r3.getCell(1).font = { name: 'Arial', size: 12, bold: true };
  r3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 4: Spacer
  ws.addRow([]);

  // --- Table Headers (Row 5) ---
  // Columns: A,B (1-10) | C,D (11-20) | E,F (21-30) | G,H (31)
  const tableHeader = ['Tanggal', 'Harga', 'Tanggal', 'Harga', 'Tanggal', 'Harga', 'Tanggal', 'Harga'];
  const headerRow = ws.addRow(tableHeader);

  // Style blue header
  const blueFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }; // Excel Blue
  const whiteFont = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
  const centerAlign = { horizontal: 'center', vertical: 'middle' };
  const borderThin = {
    top: { style: 'thin' }, margin: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
  };

  for (let c = 1; c <= 8; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = blueFill;
    cell.font = whiteFont;
    cell.alignment = centerAlign;
    cell.border = borderThin;
  }

  // Set Column Widths
  // Tanggal cols (1,3,5,7) width 15, Price cols (2,4,6,8) width 15
  for (let c = 1; c <= 8; c++) {
    ws.getColumn(c).width = 15;
  }

  // --- Data Population ---
  const priceMap = new Map<number, { date: string, price: number }>();
  rows.forEach(r => {
    if (r.day) {
      const val = r[commodityName];
      priceMap.set(r.day, { date: r._rawDate, price: Number(val || 0) });
    }
  });

  // Populate the 10-row blocks
  for (let i = 0; i < 10; i++) {
    const d1 = 1 + i;
    const d2 = 11 + i;
    const d3 = 21 + i;
    const d4 = 31 + i;

    const cellValues: any[] = [];

    const appendDay = (d: number) => {
      if (d > 31) { cellValues.push('', ''); return; }
      const data = priceMap.get(d);
      if (data) {
        cellValues.push(data.date, data.price);
      } else {
        // Fallback for missing data
        const sampleRaw = rows[0]?._rawDate;
        if (sampleRaw) {
          const [y, mStr] = sampleRaw.split('-');
          const m = Number(mStr) - 1;
          const testDate = new Date(Number(y), m, d);
          if (testDate.getMonth() === m && testDate.getDate() === d) {
            const iso = `${y}-${mStr}-${String(d).padStart(2, '0')}`;
            cellValues.push(iso, 0);
          } else {
            cellValues.push('', '');
          }
        } else {
          cellValues.push('', '');
        }
      }
    };

    appendDay(d1);
    appendDay(d2);
    appendDay(d3);
    if (d4 === 31) appendDay(d4); else cellValues.push('', '');

    const r = ws.addRow(cellValues);

    // Style data cells
    r.eachCell((cell: any, col: number) => {
      cell.alignment = centerAlign;
      cell.border = borderThin;
      // Price columns are 2, 4, 6, 8
      if (col % 2 === 0 && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const arrayBuffer: ArrayBuffer = buf instanceof ArrayBuffer ? buf : (buf as any).buffer;
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveBlob(blob, fileName ?? 'laporan-komoditas.xlsx');
}

/** Export Average Price Table
 * Mode 1: All Markets -> Table: [No, Komoditas, Rata-rata Harga]
 * Mode 2: Per Market -> Matrix: [No, Komoditas, Pasar A, Pasar B, ...]
 */
export async function exportAveragePriceExcel(params: {
  mode: 'all-markets' | 'per-market';
  data: Array<{ commodity: string; market?: string; avg: number }>;
  marketNames?: string[]; // For per-market columns
  title: string;
  fileName: string;
}) {
  const { mode, data, title, fileName, marketNames = [] } = params;
  const Workbook = await loadWorkbookCtor();
  const wb: any = new Workbook();

  wb.creator = 'HARPA BANUA';
  wb.created = new Date();

  const ws = wb.addWorksheet('Rata-rata Harga', {
    views: [{ state: 'normal', showGridLines: true }]
  });

  const borderThin = {
    top: { style: 'thin' }, margin: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
  };
  const applyHeaderStyle = (cell: any) => {
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
  };

  if (mode === 'all-markets') {
    // Columns: No, Komoditas, Rata-rata (A, B, C)

    // Title (Merged A-C) (Cols 1-3)
    ws.mergeCells(1, 1, 1, 3);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 25;

    // Spacer
    ws.addRow([]);

    // Header
    const headers = ['No', 'Komoditas', 'Rata-rata (Rp)'];
    const hRow = ws.addRow(headers);
    applyHeaderStyle(hRow.getCell(1));
    applyHeaderStyle(hRow.getCell(2));
    applyHeaderStyle(hRow.getCell(3));

    ws.getColumn(1).width = 5;  // No
    ws.getColumn(2).width = 30; // Komoditas
    ws.getColumn(3).width = 20; // Rata-rata

    data.forEach((item, idx) => {
      const r = ws.addRow([idx + 1, item.commodity, item.avg]);
      // Cell 1 (No)
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(1).border = borderThin;
      // Cell 2 (Komoditas)
      r.getCell(2).alignment = { horizontal: 'left' };
      r.getCell(2).border = borderThin;
      // Cell 3 (Avg)
      r.getCell(3).alignment = { horizontal: 'right' };
      r.getCell(3).numFmt = '#,##0';
      r.getCell(3).border = borderThin;
    });

  } else {
    // Mode: per-market (Crosstab)
    // A=No, B=Komoditas, C..=Markets

    // 1. Commodities
    const commodities = Array.from(new Set(data.map(d => d.commodity))).sort();
    // 2. Markets
    const markets = marketNames.length > 0
      ? marketNames
      : Array.from(new Set(data.map(d => d.market || 'Unknown'))).sort();

    const totalCols = 2 + markets.length; // No + Komoditas + Markets

    // Title Merged (1 to totalCols)
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 25;

    // Spacer
    ws.addRow([]);

    // Header
    const headers = ['No', 'Komoditas', ...markets];
    const hRow = ws.addRow(headers);

    // Apply style to header cells (1 to totalCols)
    for (let c = 1; c <= totalCols; c++) {
      applyHeaderStyle(hRow.getCell(c));
    }

    ws.getColumn(1).width = 5;   // No
    ws.getColumn(2).width = 30;  // Komoditas
    for (let i = 0; i < markets.length; i++) ws.getColumn(3 + i).width = 18;

    // Build map: commodity -> market -> price
    const priceMap = new Map<string, Map<string, number>>();
    data.forEach(d => {
      if (!priceMap.has(d.commodity)) priceMap.set(d.commodity, new Map());
      priceMap.get(d.commodity)?.set(d.market || 'Unknown', d.avg);
    });

    commodities.forEach((comm, idx) => {
      const rowVals: any[] = [idx + 1, comm];
      const commMap = priceMap.get(comm);
      markets.forEach(m => {
        rowVals.push(commMap?.get(m) ?? 0);
      });

      const r = ws.addRow(rowVals);
      // No
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(1).border = borderThin;
      // Komoditas
      r.getCell(2).alignment = { horizontal: 'left' };
      r.getCell(2).border = borderThin;

      // Market columns
      for (let i = 0; i < markets.length; i++) {
        const cell = r.getCell(3 + i);
        cell.alignment = { horizontal: 'right' };
        cell.numFmt = '#,##0';
        cell.border = borderThin;
      }
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const arrayBuffer: ArrayBuffer = buf instanceof ArrayBuffer ? buf : (buf as any).buffer;
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveBlob(blob, fileName);
}

/** 
 * Export Generic Simple Table (e.g. List of Markets, Users, etc.)
 * Headers: Array of strings
 * Rows: Array of objects or arrays matching headers
 * fileName: output filename
 */

/** 
 * Export Generic Simple Table (e.g. List of Markets, Users, etc.)
 * Headers: Array of strings
 * Rows: Array of objects or arrays matching headers
 * fileName: output filename
 * columns: Optional styling per column (width, alignment)
 */
export async function exportSimpleTable(params: {
  headers: string[];
  data: any[];
  title: string;
  fileName: string;
  columns?: { width?: number; alignment?: any }[];
}) {
  const { headers, data, title, fileName, columns } = params;
  const Workbook = await loadWorkbookCtor();
  const wb: any = new Workbook();

  wb.creator = 'HARPA BANUA';
  wb.created = new Date();

  const ws = wb.addWorksheet('Sheet1', {
    views: [{ state: 'normal', showGridLines: true }]
  });

  // Title
  ws.addRow([title]);
  ws.mergeCells(1, 1, 1, headers.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.font = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 25;
  ws.addRow([]);

  // Headers
  const hRow = ws.addRow(headers);
  hRow.eachCell((cell: any) => {
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Column Widths & Styles
  if (columns && columns.length > 0) {
    columns.forEach((col, idx) => {
      if (idx < headers.length) {
        if (col.width) ws.getColumn(idx + 1).width = col.width;
      }
    });
  } else {
    // Default auto width
    ws.columns = headers.map(() => ({ width: 25 }));
  }

  // Data
  data.forEach((item) => {
    const rowVals = Array.isArray(item) ? item : Object.values(item);
    const r = ws.addRow(rowVals);

    // Apply styling per cell if defined in columns
    if (columns) {
      r.eachCell((cell: any, colNumber: number) => {
        const colDef = columns[colNumber - 1]; // colNumber is 1-based
        const borderThin = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

        cell.border = borderThin;
        cell.alignment = {
          vertical: 'top',
          horizontal: 'left',
          wrapText: true, // Default wrap text
          ...colDef?.alignment
        };
      });
    } else {
      // Default styling
      r.eachCell((cell: any) => {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  const arrayBuffer: ArrayBuffer = buf instanceof ArrayBuffer ? buf : (buf as any).buffer;
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveBlob(blob, fileName);
}
