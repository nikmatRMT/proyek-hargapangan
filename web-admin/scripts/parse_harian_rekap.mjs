import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function main() {
  const arg = process.argv[2] || path.join('..', "Harian Rekap'25.xlsx");
  const filePath = path.resolve(process.cwd(), arg);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(2);
  }

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(filePath);
  } catch (err) {
    console.error('Failed to read workbook:', err);
    process.exit(3);
  }

  const out = { file: filePath, sheetCount: wb.worksheets.length, sheets: [] };
  for (const ws of wb.worksheets) {
    const sheet = { name: ws.name, rowCount: ws.rowCount, columns: [], sampleRows: [] };
    // read header row (first non-empty row)
    const firstRow = ws.getRow(1);
    const headers = [];
    firstRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers.push(cell.text || cell.value || '');
    });
    sheet.columns = headers;

    const maxSample = Math.min(20, ws.rowCount);
    for (let r = 1; r <= maxSample; r++) {
      const row = ws.getRow(r);
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        vals.push(cell.text ?? cell.value ?? '');
      });
      sheet.sampleRows.push(vals);
    }

    out.sheets.push(sheet);
  }

  console.log(JSON.stringify(out, null, 2));
}

main();
