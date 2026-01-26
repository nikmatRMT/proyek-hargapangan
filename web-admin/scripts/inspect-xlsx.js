import ExcelJS from 'exceljs';
import path from 'path';

const file = path.resolve(process.cwd(), 'tmp-export', 'semua-pasar-2026-01 (15).xlsx');
console.log('Inspecting', file);

const wb = new ExcelJS.Workbook();
(async ()=>{
  try{
    await wb.xlsx.readFile(file);
    const summary = wb.worksheets.map(ws=>{
      const rows = [];
      const max = Math.min(5, ws.rowCount);
      for (let i=1;i<=max;i++){
        const row = ws.getRow(i).values;
        // ExcelJS rows have first index empty
        rows.push(row.slice(1));
      }
      return { name: ws.name, rowCount: ws.rowCount, preview: rows };
    });
    console.log(JSON.stringify(summary, null, 2));
  }catch(err){
    console.error('ERROR', err.message || err);
    process.exitCode = 2;
  }
})();
