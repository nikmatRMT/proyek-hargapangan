import express from 'express';
import PDFDocument from 'pdfkit';
import { getDb } from '../tools/db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// --- HELPER FUNCTIONS ---

function getMonthLabel(dateISO) {
  const [y, m] = dateISO.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
}

function getDayAndWeek(dateObj) {
  const date = new Date(dateObj);
  const day = date.getDate();
  let week = '';
  // Logika Minggu Sederhana (1-7=I, 8-14=II, dst)
  if (day >= 1 && day <= 7) week = 'I';
  else if (day >= 8 && day <= 14) week = 'II';
  else if (day >= 15 && day <= 21) week = 'III';
  else if (day >= 22 && day <= 28) week = 'IV';
  else if (day >= 29) week = 'V';

  // Tampilkan label minggu hanya pada tanggal awal siklus
  const showWeek = [1, 8, 15, 22, 29].includes(day) ? week : '';
  return { day, showWeek, rawWeek: week };
}

// Penyingkat Nama Header Komoditas
function shortenHeader(text) {
  return String(text || '')
    .replace('Kemasan', 'Kms')
    .replace('Curah', 'Crh')
    .replace('Minyak Goreng', 'Myk Grg')
    .replace('Tepung Terigu', 'Tepung')
    .replace('Daging', 'Dgg')
    .replace('Bawang', 'Bwg')
    .replace('Besar', 'Bsr')
    .replace('Kecil', 'Kcl')
    .replace('(Rp/Kg)', '')
    .replace('(Rp/Liter)', '')
    .trim();
}

// --- MAIN ENDPOINT ---

router.get('/export-pdf-backup-all', requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // 1. Filter Waktu
    const filter = {};
    if (from || to) {
      filter.tanggal_lapor = {};
      if (from) filter.tanggal_lapor.$gte = from;
      if (to) filter.tanggal_lapor.$lte = to;
    }

    const db = getDb();
    
    // 2. Fetch Data Master
    const marketsInfo = await db.collection('pasar').find({}).toArray();
    const commoditiesInfo = await db.collection('komoditas').find({}).toArray();

    const marketMap = {};
    marketsInfo.forEach(m => { marketMap[m.id] = m; });
    const commodityMap = {};
    commoditiesInfo.forEach(c => { commodityMap[c.id] = c; });

    // 3. Fetch Data Laporan
    const data = await db.collection('laporan_harga')
      .find(filter)
      .sort({ market_id: 1, tanggal_lapor: 1 })
      .toArray();

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data untuk di-export pada periode ini.' });
    }

    // 4. Setup PDF (Margin 0 untuk kontrol manual penuh)
    const doc = new PDFDocument({ size: 'A4', margin: 0, layout: 'landscape' });
    const buffers = [];
    const filename = `backup-semua-pasar-${Date.now()}.pdf`;

    doc.on('data', (c) => buffers.push(c));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfData);
    });

    // 5. Grouping Data: Market -> Month -> Date -> CommID
    const grouped = {};
    data.forEach(row => {
      const mId = row.market_id;
      const dateObj = new Date(row.tanggal_lapor);
      const dateKey = dateObj.toISOString().slice(0, 10);
      const monthKey = dateKey.slice(0, 7); // YYYY-MM

      if (!grouped[mId]) grouped[mId] = {};
      if (!grouped[mId][monthKey]) grouped[mId][monthKey] = {};
      if (!grouped[mId][monthKey][dateKey]) grouped[mId][monthKey][dateKey] = {};
      
      grouped[mId][monthKey][dateKey][row.komoditas_id] = row.harga;
    });

    let isGlobalFirstPage = true;

    // 6. Loop Utama: Pasar -> Bulan -> Batch Halaman
    const marketIds = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

    for (const mId of marketIds) {
      const marketName = marketMap[mId]?.nama_pasar || `Pasar ${mId}`;
      const marketAddress = marketMap[mId]?.alamat || '';

      const months = Object.keys(grouped[mId]).sort();
      
      for (const monthKey of months) {
        const dailyData = grouped[mId][monthKey];
        const dates = Object.keys(dailyData).sort();

        // Cari semua komoditas yang eksis di bulan ini untuk pasar ini
        const commSet = new Set();
        dates.forEach(d => Object.keys(dailyData[d]).forEach(id => commSet.add(id)));
        // Sort komoditas by ID agar urut
        const allComms = Array.from(commSet).sort((a, b) => Number(a) - Number(b));

        // --- PAGINATION LOGIC (Split Column) ---
        // A4 Landscape muat sekitar 16 kolom komoditas + 2 kolom tgl/minggu
        const MAX_COLS = 16; 
        const commBatches = [];
        for (let i = 0; i < allComms.length; i += MAX_COLS) {
          commBatches.push(allComms.slice(i, i + MAX_COLS));
        }

        // Loop Batch (Halaman)
        commBatches.forEach((batchIds, batchIndex) => {
          // Buat halaman baru, kecuali ini benar-benar halaman pertama file
          if (!isGlobalFirstPage) {
            doc.addPage();
          }
          isGlobalFirstPage = false;

          // --- CONFIG LAYOUT ---
          const MARGIN_LEFT = 20;
          const MARGIN_TOP = 20;
          const PAGE_WIDTH = doc.page.width;
          const PAGE_HEIGHT = doc.page.height;
          let currentY = MARGIN_TOP;

          // --- HEADER DOKUMEN ---
          if (batchIndex === 0) {
            // Halaman Pertama untuk Bulan ini (Judul Lengkap)
            doc.fontSize(14).font('Helvetica-Bold').text('LAPORAN HARGA PASAR BAHAN PANGAN', MARGIN_LEFT, currentY, { width: PAGE_WIDTH - 40, align: 'center' });
            currentY += 16;
            doc.fontSize(11).text(marketName, MARGIN_LEFT, currentY, { width: PAGE_WIDTH - 40, align: 'center' });
            currentY += 14;
            if (marketAddress) {
                doc.fontSize(8).font('Helvetica').text(marketAddress, MARGIN_LEFT, currentY, { width: PAGE_WIDTH - 40, align: 'center' });
                currentY += 12;
            }
            doc.fontSize(10).font('Helvetica-Bold').text(getMonthLabel(monthKey + '-01'), MARGIN_LEFT, currentY, { width: PAGE_WIDTH - 40, align: 'center' });
            currentY += 20;
          } else {
            // Halaman Lanjutan (Judul Singkat)
            doc.fontSize(8).font('Helvetica-Oblique').text(`(Lanjutan) ${marketName} - ${getMonthLabel(monthKey + '-01')}`, MARGIN_LEFT, 20);
            currentY = 35;
          }

          // --- UKURAN TABEL ---
          const workingWidth = PAGE_WIDTH - (MARGIN_LEFT * 2);
          const colW_Week = 20;
          const colW_Date = 20;
          
          // Hitung lebar dinamis kolom komoditas
          const remainingSpace = workingWidth - colW_Week - colW_Date;
          // Math.floor penting agar garis tajam di browser
          const colW_Comm = Math.floor(remainingSpace / batchIds.length);
          
          // Hitung total lebar real
          const tableRealWidth = colW_Week + colW_Date + (colW_Comm * batchIds.length);
          // Center alignment
          const startX = MARGIN_LEFT + ((workingWidth - tableRealWidth) / 2);

          const rowHeight = 12;
          const headerHeight = 25;

          // Style Garis
          doc.lineWidth(0.5);
          doc.lineJoin('miter');

          // --- DRAW TABLE HEADER ---
          let currentX = startX;
          doc.font('Helvetica-Bold').fontSize(7);

          // Helper draw cell
          const drawCell = (x, y, w, h, txt, isBg = false) => {
            if (isBg) doc.rect(x, y, w, h).fill('#e0e0e0');
            doc.strokeColor('#000').rect(x, y, w, h).stroke();
            doc.fillColor('#000').text(txt, x, y + (h/2) - 3, { width: w, align: 'center', lineGap: -1 });
          };

          drawCell(currentX, currentY, colW_Week, headerHeight, 'Mg', true);
          currentX += colW_Week;
          
          drawCell(currentX, currentY, colW_Date, headerHeight, 'Tgl', true);
          currentX += colW_Date;

          batchIds.forEach(cid => {
            const rawName = commodityMap[cid]?.nama_komoditas || `K${cid}`;
            const cName = shortenHeader(rawName);
            const rawUnit = commodityMap[cid]?.satuan || '';
            const cUnit = rawUnit.toLowerCase().includes('liter') ? 'Ltr' : 'Kg';
            
            // Header Komoditas
            doc.rect(currentX, currentY, colW_Comm, headerHeight).fillAndStroke('#e0e0e0', '#000');
            doc.fillColor('#000').text(`${cName}\n(${cUnit})`, currentX + 1, currentY + 4, { 
                width: colW_Comm - 2, align: 'center', lineGap: -1 
            });
            currentX += colW_Comm;
          });

          currentY += headerHeight;

          // --- DRAW DATA ROWS ---
          doc.font('Helvetica').fontSize(7);
          
          // Siapkan akumulator rata-rata
          const sumPerCol = {}; 
          const countPerCol = {};
          batchIds.forEach(id => { sumPerCol[id] = 0; countPerCol[id] = 0; });

          dates.forEach(d => {
            const { day, showWeek } = getDayAndWeek(d);
            const rowData = dailyData[d];
            let rowX = startX;

            // Zebra Striping
            if (day % 2 === 0) {
              doc.rect(rowX, currentY, tableRealWidth, rowHeight).fill('#f9f9f9');
            }

            // Cell Minggu
            doc.rect(rowX, currentY, colW_Week, rowHeight).stroke();
            if (showWeek) {
               doc.font('Helvetica-Bold').fillColor('#000').text(showWeek, rowX, currentY + 3, { width: colW_Week, align: 'center' });
            }
            rowX += colW_Week;

            // Cell Tanggal
            doc.font('Helvetica').fillColor('#000').text(day.toString(), rowX, currentY + 3, { width: colW_Date, align: 'center' });
            doc.rect(rowX, currentY, colW_Date, rowHeight).stroke();
            rowX += colW_Date;

            // Cell Harga
            batchIds.forEach(cid => {
              const val = rowData[cid];
              let txt = '-';
              if (val !== undefined && val !== null) {
                txt = new Intl.NumberFormat('id-ID').format(val);
                sumPerCol[cid] += val;
                countPerCol[cid] += 1;
              }
              doc.rect(rowX, currentY, colW_Comm, rowHeight).stroke();
              doc.text(txt, rowX, currentY + 3, { width: colW_Comm - 2, align: 'center' });
              rowX += colW_Comm;
            });

            currentY += rowHeight;

            // Cek Page Break Vertikal (Safety jika tanggal > 31 atau row tinggi)
            if (currentY > PAGE_HEIGHT - 30) {
               doc.addPage();
               currentY = 20;
               // Bisa gambar header ulang disini jika mau
            }
          });

          // --- DRAW ROW RATA-RATA ---
          let avgRowX = startX;
          doc.font('Helvetica-Bold');
          
          // Merge kolom Minggu & Tgl
          doc.rect(avgRowX, currentY, colW_Week + colW_Date, rowHeight).fillAndStroke('#eeeeee', '#000');
          doc.fillColor('#000').text('Rata-rata', avgRowX, currentY + 3, { width: colW_Week + colW_Date, align: 'center' });
          avgRowX += (colW_Week + colW_Date);

          batchIds.forEach(cid => {
            const count = countPerCol[cid];
            const sum = sumPerCol[cid];
            const avg = count > 0 ? Math.round(sum / count) : 0;
            const avgText = avg > 0 ? new Intl.NumberFormat('id-ID').format(avg) : '-';

            doc.rect(avgRowX, currentY, colW_Comm, rowHeight).fillAndStroke('#eeeeee', '#000');
            doc.fillColor('#000').text(avgText, avgRowX, currentY + 3, { width: colW_Comm - 2, align: 'center' });
            avgRowX += colW_Comm;
          });

          // Footer
          const now = new Date();
          const timestamp = `Dicetak: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;
          doc.fontSize(6).font('Helvetica-Oblique').fillColor('#555')
             .text(timestamp, MARGIN_LEFT, PAGE_HEIGHT - 20);

        }); // End Batch Loop
      } // End Month Loop
    } // End Market Loop

    doc.end();
  } catch (err) {
    console.error('[export-pdf-backup-all] Error', err);
    if (!res.headersSent) res.status(500).json({ error: String(err) });
  }
});

export default router;
