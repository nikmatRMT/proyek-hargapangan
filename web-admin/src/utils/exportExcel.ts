// src/utils/exportExcel.ts

/** Loader exceljs yang aman di browser (Vite) */
async function loadWorkbookCtor(): Promise<new () => any> {
  // Coba browser build dulu (paling stabil untuk bundler)
  try {
    const mod: any = await import('exceljs/dist/exceljs.min.js');
    const Excel = mod?.default ?? mod;
    if (Excel?.Workbook) return Excel.Workbook as new () => any;
  } catch {}
  // Fallback ke paket utama
  try {
    const mod: any = await import('exceljs');
    const Excel = mod?.default ?? mod;
    if (Excel?.Workbook) return Excel.Workbook as new () => any;
  } catch {}
  throw new Error(
    "Tidak bisa memuat exceljs. Pastikan paket 'exceljs' terpasang & bundler tidak mem-pollyfill Node core."
  );
}

/** Tipe baris yang dipakai writer */
export type MarketRow = {
  week: string; day: number;
  beras: number; minyakGorengKemasan: number; minyakGorengCurah: number;
  tepungTeriguKemasan: number; tepungTeriguCurah: number; gulaPasir: number; telurAyam: number;
  dagingSapi: number; dagingAyam: number; kedelai: number; bawangMerah: number; bawangPutih: number;
  cabeMerahBesar: number; cabeRawit: number; ikanHaruan: number; ikanTongkol: number;
  ikanMas: number; ikanPatin: number; ikanPapuyu: number; ikanBandeng: number; ikanKembung: number;
};

const HEADER_COMMODITIES = [
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
] as const;

const UNIT_ROW: string[] = [
  '(Rp/Kg)', '(Rp/Liter)', '(Rp/Liter)', '(Rp/Kg)', '(Rp/Kg)',
  '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)',
  '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)',
  '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)',
];

/** ubah px → lebar karakter (ExcelJS) */
function setColumnWidthPx(ws: any, col: number, px: number) {
  const width = Math.max(0, (px - 5) / 7);
  ws.getColumn(col).width = Math.round(width * 100) / 100;
}

/** Core: tulis 1 tabel ke worksheet, ditempel di bawah baris terakhir yang ada */
function writeTableToWorksheet(
  ws: any,
  opts: { title: string; monthLabel: string; rows: MarketRow[] }
) {
  const { title, monthLabel, rows = [] } = opts;

  // layout kolom
  setColumnWidthPx(ws, 1, 5);    // A (kosong)
  setColumnWidthPx(ws, 2, 70);   // B Minggu
  setColumnWidthPx(ws, 3, 90);   // C Tanggal
  for (let c = 4; c <= 24; c++) setColumnWidthPx(ws, c, 94); // D..X komoditas

  // ===== Judul (merge A..X)
  ws.addRow([]);
  const titleRow: any = ws.getRow(ws.lastRow.number);
  titleRow.height = 25;
  const titleCell: any = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells(titleRow.number, 1, titleRow.number, 24);

  // ===== Header & Unit
  const headerRow: any = ws.addRow(['', 'Minggu', 'Tanggal', ...HEADER_COMMODITIES]);
  const unitVals: any[] = Array(24).fill('');
  unitVals[2] = monthLabel; // kolom C
  for (let i = 0; i < UNIT_ROW.length; i++) unitVals[3 + i] = UNIT_ROW[i];
  const unitsRow: any = ws.addRow(unitVals);

  // Merge B(header) 2 baris (Minggu)
  ws.mergeCells(headerRow.number, 2, unitsRow.number, 2);

  const borderThin = {
    top:    { style: 'thin' as const },
    left:   { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right:  { style: 'thin' as const },
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
  const toRow = (r: MarketRow): (string | number)[] => [
    '',
    r.week || '',
    r.day,
    r.beras, r.minyakGorengKemasan, r.minyakGorengCurah, r.tepungTeriguKemasan,
    r.tepungTeriguCurah, r.gulaPasir, r.telurAyam, r.dagingSapi, r.dagingAyam,
    r.kedelai, r.bawangMerah, r.bawangPutih, r.cabeMerahBesar, r.cabeRawit,
    r.ikanHaruan, r.ikanTongkol, r.ikanMas, r.ikanPatin, r.ikanPapuyu, r.ikanBandeng, r.ikanKembung,
  ];

  const firstDataRowIdx = ws.lastRow.number + 1;
  for (const r of rows) {
    const row: any = ws.addRow(toRow(r));
    row.eachCell((cell: any, col: number) => {
      if (col === 1) return;
      const isWeekCell = col === 2 && !!r.week;
      cell.font = { name: isWeekCell ? 'Arial' : 'Roboto', bold: isWeekCell };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
      if (typeof cell.value === 'number') cell.numFmt = '#,##0';
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
    const nums = weekRows.map((r) => Number(r[k] ?? 0));
    return Math.round(nums.reduce((a, b) => a + b, 0) / (nums.length || 1));
  };

  const avgRow: any = ws.addRow([
    '', 'Rata-Rata', '',
    avg('beras'), avg('minyakGorengKemasan'), avg('minyakGorengCurah'), avg('tepungTeriguKemasan'),
    avg('tepungTeriguCurah'), avg('gulaPasir'), avg('telurAyam'), avg('dagingSapi'), avg('dagingAyam'),
    avg('kedelai'), avg('bawangMerah'), avg('bawangPutih'), avg('cabeMerahBesar'), avg('cabeRawit'),
    avg('ikanHaruan'), avg('ikanTongkol'), avg('ikanMas'), avg('ikanPatin'), avg('ikanPapuyu'), avg('ikanBandeng'), avg('ikanKembung'),
  ]);

  const greyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6DCE4' } };
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
    if (typeof cell.value === 'number') cell.numFmt = '#,##0';
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
  title: string; monthLabel: string; rows: MarketRow[]; fileName?: string;
}) {
  const Workbook = await loadWorkbookCtor();
  const wb: any = new Workbook();
  
  // Set workbook properties untuk avoid Excel warning
  wb.creator = 'HARPA BANUA';
  wb.lastModifiedBy = 'HARPA BANUA';
  wb.created = new Date();
  wb.modified = new Date();
  wb.lastPrinted = new Date();
  
  const ws = wb.addWorksheet('Sheet1', {
    properties: { tabColor: { argb: 'FF00FF00' } },
    views: [{ state: 'normal' }]
  });

  writeTableToWorksheet(ws, opts);

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
