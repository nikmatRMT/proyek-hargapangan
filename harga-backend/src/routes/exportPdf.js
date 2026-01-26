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
  // Logika Minggu Sederhana
  if (day >= 1 && day <= 7) week = 'I';
  else if (day >= 8 && day <= 14) week = 'II';
  else if (day >= 15 && day <= 21) week = 'III';
  else if (day >= 22 && day <= 28) week = 'IV';
  else if (day >= 29) week = 'V';

  const showWeek = [1, 8, 15, 22, 29].includes(day) ? week : '';
  return { day, showWeek, rawWeek: week };
}

// Fungsi untuk menyingkat nama header agar muat di kolom kecil
function shortenHeader(text) {
  return text
    .replace('Kemasan', 'Kms')
    .replace('Curah', 'Crh')
    .replace('Minyak Goreng', 'Myk Grg')
    .replace('Tepung Terigu', 'Tepung')
    .replace('Daging', 'Dgg')
    .replace('Bawang', 'Bwg')
    .replace('Besar', 'Bsr')
    .replace('Kecil', 'Kcl')
    .replace('(Rp/Kg)', '')     // Hapus satuan di nama, nanti taruh di baris bawah
    .replace('(Rp/Liter)', '')
    .trim();
}

// --- MAIN ENDPOINT ---

router.get('/export-pdf', requireAuth, async (req, res) => {
  try {
    const { from, to, market, komoditas } = req.query;

    console.log('[Export PDF] Query Parameters:', { from, to, market, komoditas });

    // --- FILTERING ---
    const filter = {};
    if (from || to) {
      filter.tanggal_lapor = {};
      if (from) filter.tanggal_lapor.$gte = from; 
      if (to) filter.tanggal_lapor.$lte = to;
    }
    if (market && market !== 'all') {
      filter.market_id = Number(market);
    }

    if (komoditas) {
       const db = getDb();
       const found = await db.collection('komoditas').findOne({ nama_komoditas: komoditas });
       if (found) filter.komoditas_id = found.id;
    }

    console.log('[Export PDF] Filter Object:', filter);

    const db = getDb();
    const marketsInfo = await db.collection('pasar').find({}).toArray();
    const commoditiesInfo = await db.collection('komoditas').find({}).toArray();

    const marketMap = {}; // Initialize marketMap
    marketsInfo.forEach(m => marketMap[m.id] = m);

    const commodityMap = {}; // Initialize commodityMap
    commoditiesInfo.forEach(c => commodityMap[c.id] = c);

    console.log('[Export PDF] Market Map:', marketMap);
    console.log('[Export PDF] Commodity Map:', commodityMap);

    const data = await db.collection('laporan_harga')
      .find(filter)
      .sort({ tanggal_lapor: 1, market_id: 1 })
      .toArray();

    console.log('[Export PDF] Data Count:', data.length);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data untuk di-export' });
    }

    // --- PDF SETUP (A4 LANDSCAPE) ---
    // Margin diperkecil (20) agar muat lebih banyak kolom
    const doc = new PDFDocument({ size: 'A4', margin: 20, layout: 'landscape' });
    const buffers = [];
    const filename = `laporan-harga-${Date.now()}.pdf`;
    
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfData);
    });

    // --- DATA GROUPING ---
    const grouped = {};
    data.forEach(row => {
      const mId = row.market_id;
      const dateObj = new Date(row.tanggal_lapor);
      const dateKey = dateObj.toISOString().slice(0, 10);
      const monthKey = dateKey.slice(0, 7);

      if (!grouped[mId]) grouped[mId] = {};
      if (!grouped[mId][monthKey]) grouped[mId][monthKey] = {};
      if (!grouped[mId][monthKey][dateKey]) grouped[mId][monthKey][dateKey] = {};

      grouped[mId][monthKey][dateKey][row.komoditas_id] = row.harga;
    });

    let isDocFirstPage = true;

    // --- LOOP PASAR ---
    for (const mId of Object.keys(grouped)) {
      const marketName = marketMap[mId]?.nama_pasar || `Pasar ${mId}`;
      const marketAddress = marketMap[mId]?.alamat || 'Jl. RO Ulin Kelurahan Loktabat Selatan';

      // --- LOOP BULAN ---
      for (const monthKey of Object.keys(grouped[mId])) {
        const dailyData = grouped[mId][monthKey];
        const dates = Object.keys(dailyData).sort();

        // Ambil semua komoditas yang ada datanya di bulan ini
        const commodityIdSet = new Set();
        dates.forEach(d => {
          Object.keys(dailyData[d]).forEach(cId => commodityIdSet.add(cId));
        });
        const allCommodityIds = Array.from(commodityIdSet).sort((a, b) => Number(a) - Number(b));

        // --- KONFIGURASI HALAMAN & KOLOM ---
        // A4 Landscape Width ~842pt. Margin 20 kiri kanan. Usable ~800pt.
        // Kolom Minggu (25pt) + Tgl (25pt) = 50pt Fixed. Sisa 750pt.
        // Jika kita set lebar kolom komoditas minimal 45pt (cukup utk angka 100.000), 
        // maka muat sekitar 16-17 komoditas per halaman.
        
        const MAX_COLS_PER_PAGE = 16; 
        const commodityBatches = [];
        for (let i = 0; i < allCommodityIds.length; i += MAX_COLS_PER_PAGE) {
          commodityBatches.push(allCommodityIds.slice(i, i + MAX_COLS_PER_PAGE));
        }

        // Loop Batch Komoditas (Halaman 1: Komoditas A-M, Halaman 2: Komoditas N-Z)
        commodityBatches.forEach((batchIds, batchIndex) => {
          if (batchIndex > 0) {
            doc.addPage(); // Add a new page only for subsequent batches
          }

          let currentY = 20; // Default top margin

          // Header logic remains unchanged
          if (batchIndex === 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('LAPORAN HARGA PASAR BAHAN PANGAN', { align: 'center' });
            doc.fontSize(11).text(marketName, { align: 'center' });
            doc.fontSize(8).font('Helvetica').text(marketAddress, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica-Bold').text(getMonthLabel(monthKey + '-01'), { align: 'center' });
            doc.moveDown(0.5);
            currentY = doc.y; // Update Y after header
          } else {
            doc.fontSize(8).font('Helvetica-Oblique').text(`(Lanjutan) ${marketName} - ${getMonthLabel(monthKey + '-01')}`, 20, 20, { align: 'left' });
            currentY = 35; // Start table higher
          }

          // Table layout logic remains unchanged
          const startX = 20;
          const pageWidth = doc.page.width - 40; // 40 = margin left and right
          const colWidthWeek = 25; // Increased width for better alignment
          const colWidthDate = 25; // Increased width for better alignment
          const remainingWidth = pageWidth - colWidthWeek - colWidthDate;
          const colWidthComm = Math.max(30, Math.floor(remainingWidth / batchIds.length)); // Adjusted minimum width
          const rowHeight = 12; // Increased row height for better spacing
          // Perlebar tinggi header agar nama komoditas dapat membungkus tanpa meluber
          const headerHeight = 36; // lebih tinggi supaya teks 2 baris muat rapi

          let currentX = startX;

          // Draw table header
          doc.font('Helvetica-Bold').fontSize(7); // Slightly larger font for headers
          doc.lineWidth(0.5);

          doc.rect(currentX, currentY, colWidthWeek, headerHeight).fillAndStroke('#e0e0e0', '#000');
          doc.fillColor('#000').text('Mg', currentX, currentY + 8, { width: colWidthWeek, align: 'center' });
          currentX += colWidthWeek;

          doc.rect(currentX, currentY, colWidthDate, headerHeight).fillAndStroke('#e0e0e0', '#000');
          doc.fillColor('#000').text('Tgl', currentX, currentY + 8, { width: colWidthDate, align: 'center' });
          currentX += colWidthDate;

          // Gunakan font sedikit lebih kecil dan beri padding agar teks header membungkus rapi
          doc.font('Helvetica-Bold').fontSize(6);
          batchIds.forEach(cId => {
            const rawName = commodityMap[cId]?.nama_komoditas || `Kom ${cId}`;
            const cName = shortenHeader(rawName);
            const rawUnit = commodityMap[cId]?.satuan || '';
            const cUnit = rawUnit.toLowerCase().includes('liter') ? 'Ltr' : 'Kg';

            doc.rect(currentX, currentY, colWidthComm, headerHeight).fillAndStroke('#e0e0e0', '#000');
            // Tulis nama komoditas dan satuan dalam satu blok teks agar PDFKit membungkusnya
            doc.fillColor('#000').text(`${cName} (${cUnit})`, currentX + 4, currentY + 6, {
              width: colWidthComm - 8,
              align: 'center',
              lineGap: 0
            });
            currentX += colWidthComm;
          });

          currentY += headerHeight;

          // Draw data rows
          doc.font('Helvetica').fontSize(6); // Smaller font for data

          const sumPerCol = {}; 
          const countPerCol = {};
          batchIds.forEach(id => { sumPerCol[id] = 0; countPerCol[id] = 0; });

          dates.forEach((dateKey) => {
             const { day, showWeek } = getDayAndWeek(dateKey);
             const rowData = dailyData[dateKey];
             let rowX = startX;

             if (day % 2 === 0) {
                doc.rect(startX, currentY, pageWidth, rowHeight).fill('#f9f9f9');
             }

             doc.rect(rowX, currentY, colWidthWeek, rowHeight).stroke();
             if (showWeek) {
               doc.font('Helvetica-Bold').fillColor('#000').text(showWeek, rowX, currentY + 3, { width: colWidthWeek, align: 'center' });
             }
             rowX += colWidthWeek;

             doc.font('Helvetica').fillColor('#000').text(day.toString(), rowX, currentY + 3, { width: colWidthDate, align: 'center' });
             doc.rect(rowX, currentY, colWidthDate, rowHeight).stroke();
             rowX += colWidthDate;

             batchIds.forEach(cId => {
               const val = rowData[cId];
               let textVal = '-';
               if (val !== undefined && val !== null) {
                 textVal = new Intl.NumberFormat('id-ID').format(val);
                 sumPerCol[cId] += val;
                 countPerCol[cId] += 1;
               }

               doc.rect(rowX, currentY, colWidthComm, rowHeight).stroke();
               doc.text(textVal, rowX, currentY + 3, { width: colWidthComm - 2, align: 'center' });
               rowX += colWidthComm;
             });

             currentY += rowHeight;
          });

          // Draw average row
          let rowX = startX;
          doc.font('Helvetica-Bold');

          doc.rect(rowX, currentY, colWidthWeek + colWidthDate, rowHeight).fillAndStroke('#eeeeee', '#000');
          doc.fillColor('#000').text('Rata2', rowX, currentY + 3, { width: colWidthWeek + colWidthDate, align: 'center' });
          rowX += (colWidthWeek + colWidthDate);

          batchIds.forEach(cId => {
            const count = countPerCol[cId];
            const sum = sumPerCol[cId];
            const avg = count > 0 ? Math.round(sum / count) : 0;
            const avgText = avg > 0 ? new Intl.NumberFormat('id-ID').format(avg) : '-';

            doc.rect(rowX, currentY, colWidthComm, rowHeight).fillAndStroke('#eeeeee', '#000');
            doc.fillColor('#000').text(avgText, rowX, currentY + 3, { width: colWidthComm - 2, align: 'center' });
            rowX += colWidthComm;
          });
        });
      } // End Month Loop
    } // End Market Loop

    doc.end();

  } catch (error) {
    console.error('[Export PDF] Error:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINT KOMODITAS (TETAP SAMA SEPERTI SEBELUMNYA) ---
router.get('/export-pdf-komoditas', requireAuth, async (req, res) => {
    // ... Biarkan kode endpoint komoditas (vertical flow) tetap sama 
    // ... karena sudah benar logicnya untuk single commodity.
    // ... Copy paste logika komoditas dari jawaban sebelumnya jika perlu.
    // ... Atau biarkan kosong jika Anda sudah punya file terpisah.
    
    // (Agar tidak error, saya sertakan dummy response jika dipanggil disini)
    res.status(400).json({error: "Gunakan file exportPdfKomoditas.js untuk fitur ini"});
});

export default router;
