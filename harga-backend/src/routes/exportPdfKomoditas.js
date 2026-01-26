import express from 'express';
import PDFDocument from 'pdfkit';
import { getDb } from '../tools/db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// Endpoint: /export-pdf-komoditas
router.get('/export-pdf-komoditas', requireAuth, async (req, res) => {
  try {
    // Tambahkan log untuk debugging
    console.log('[Export PDF Komoditas] Endpoint dipanggil dengan parameter:', req.query);

    const { from, to, market, komoditas } = req.query;

    // Validasi dasar: `komoditas` dan `market` harus ada. `from`/`to` boleh kosong (artinya semua tanggal).
    if (!komoditas) {
      console.error('[Export PDF Komoditas] Komoditas tidak diberikan');
      return res.status(400).json({ error: 'Parameter komoditas diperlukan.' });
    }

    if (!market) {
      console.error('[Export PDF Komoditas] Market tidak diberikan');
      return res.status(400).json({ error: 'Parameter market diperlukan.' });
    }

    // Jika frontend mengirim 'all' untuk market dan komoditas juga dipilih, tolak karena laporan komoditas butuh pasar spesifik
    if (String(market) === 'all') {
      console.error('[Export PDF Komoditas] Market == all tidak didukung untuk export komoditas');
      return res.status(400).json({ error: 'Pilih pasar tertentu (bukan "all") untuk export komoditas.' });
    }

    // Log parameter untuk debugging — from/to boleh kosong
    console.log('[Export PDF Komoditas] Parameter diterima:', { from: from || null, to: to || null, market, komoditas });

    const db = getDb();
    
    // 1. Cari ID Komoditas
    const foundKomoditas = await db.collection('komoditas').findOne({ nama_komoditas: komoditas });
    if (!foundKomoditas) {
      return res.status(404).json({ error: 'Komoditas tidak ditemukan.' });
    }

    // 2. Build Filter
    const filter = { komoditas_id: foundKomoditas.id };
    if (from || to) {
      filter.tanggal_lapor = {};
      if (from) filter.tanggal_lapor.$gte = from; 
      if (to) filter.tanggal_lapor.$lte = to;
    }
    if (market && market !== 'all') {
      filter.market_id = Number(market);
    }

    // 3. Fetch Data
    const marketsInfo = await db.collection('pasar').find({}).toArray();
    const marketMap = {};
    marketsInfo.forEach(m => marketMap[m.id] = m);

    const data = await db.collection('laporan_harga')
      .find(filter)
      .sort({ tanggal_lapor: 1, market_id: 1 })
      .toArray();

    if (data.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data untuk di-export' });
    }

    // 4. Setup PDF (Landscape A4)
    const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-${komoditas}-${Date.now()}.pdf"`);
      res.send(pdfData);
    });

    // 5. Grouping Data per Pasar
    const grouped = {};
    data.forEach(row => {
      const mId = row.market_id;
      const dateObj = new Date(row.tanggal_lapor);
      const dateKey = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD

      if (!grouped[mId]) grouped[mId] = [];
      grouped[mId].push({
        tanggal: dateKey,
        harga: row.harga,
      });
    });

    // 6. Konfigurasi Tampilan
    const COL_PAIRS = 4; // Jumlah pasangan (Tgl|Harga) per baris (Layout 4 Kolom)
    const MAX_ROWS_PER_PAGE = 25; // Batas aman baris per halaman
    const ITEMS_PER_PAGE = COL_PAIRS * MAX_ROWS_PER_PAGE; 

    // Ukuran Kolom - hitung dinamis agar tabel memenuhi lebar halaman
    // Lebar A4 Landscape ~842pt. Margin 30 kiri kanan = area kerja.
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right; // otomatis dari margin = 30
    const totalCols = COL_PAIRS * 2; // setiap pair punya 2 kolom (Tanggal + Harga)
    const baseColWidth = Math.floor(usableWidth / totalCols);
    const colWidthDate = baseColWidth - 2; // beri sedikit padding
    const colWidthPrice = baseColWidth - 2;
    const tableTotalWidth = (colWidthDate + colWidthPrice) * COL_PAIRS;
    const blockWidth = colWidthDate + colWidthPrice; // lebar per blok
    const rowHeight = 22; // sedikit lebih tinggi buat keterbacaan

    let isFirstPage = true;

    // Loop Pasar
    for (const mId of Object.keys(grouped)) {
      const marketName = marketMap[mId]?.nama_pasar || `Pasar ${mId}`;
      const marketAddress = marketMap[mId]?.alamat || '';
      const marketData = grouped[mId];

      // Loop Paginasi (Jika data sangat banyak > 100 baris, pecah halaman)
      for (let i = 0; i < marketData.length; i += ITEMS_PER_PAGE) {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        // --- HEADER ---
        doc.fontSize(14).font('Helvetica-Bold').text('LAPORAN HARGA PASAR BAHAN PANGAN', { align: 'center' });
        doc.fontSize(12).text(marketName, { align: 'center' });
        if (marketAddress) doc.fontSize(10).font('Helvetica').text(marketAddress, { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(12).font('Helvetica-Bold').text(`Harga ${komoditas}`, { align: 'center' });
        doc.moveDown(1.5);

        // --- CALCULATION FOR VERTICAL FLOW ---
        const pageData = marketData.slice(i, i + ITEMS_PER_PAGE);
        // Hitung berapa baris yang dibutuhkan untuk membagi rata data ke dalam 4 kolom
        // Contoh: 31 data / 4 kolom = 7.75 -> dibulatkan jadi 8 baris ke bawah
        const rowsNeeded = Math.ceil(pageData.length / COL_PAIRS);

        // Position tabel: mulai dari margin kiri sehingga memenuhi halaman
        const startX = doc.page.margins.left;
        let startY = doc.y;

        // --- DRAW HEADER ROW (Biru) ---
        let headerX = startX;
        doc.font('Helvetica-Bold').fontSize(10);
        // Set stroke style for consistent borders
        doc.lineWidth(0.5);
        doc.strokeColor('#000');
        
        for (let c = 0; c < COL_PAIRS; c++) {
            // Header Tanggal
            doc.rect(headerX, startY, colWidthDate, rowHeight).fillAndStroke('#1976D2', '#000');
            doc.fillColor('#fff').text('Tanggal', headerX, startY + 6, { width: colWidthDate, align: 'center' });
            headerX += colWidthDate;

            // Header Harga
            doc.rect(headerX, startY, colWidthPrice, rowHeight).fillAndStroke('#1976D2', '#000');
            doc.fillColor('#fff').text('Harga', headerX, startY + 6, { width: colWidthPrice, align: 'center' });
            headerX += colWidthPrice;
        }

        // --- DRAW DATA ROWS (Vertical Flow) ---
        startY += rowHeight;
        doc.font('Helvetica').fontSize(10).fillColor('#000');
        // Save header start Y to draw outer border later
        const headerStartY = doc.y - rowHeight; // header row Y position

        for (let r = 0; r < rowsNeeded; r++) {
            let rowX = startX;
            
            // Loop Kolom ke samping
            for (let c = 0; c < COL_PAIRS; c++) {
                // Rumus Ajaib Vertical Flow: Index = (Kolom * JmlBaris) + BarisSaatIni
                const dataIndex = (c * rowsNeeded) + r; 

                if (dataIndex < pageData.length) {
                    const item = pageData[dataIndex];
                    const priceFormatted = new Intl.NumberFormat('id-ID').format(item.harga);

                    // Cell Tanggal
                    doc.rect(rowX, startY, colWidthDate, rowHeight).stroke();
                    doc.text(item.tanggal, rowX, startY + 6, { width: colWidthDate, align: 'center' });
                    rowX += colWidthDate;

                    // Cell Harga
                    doc.rect(rowX, startY, colWidthPrice, rowHeight).stroke();
                    doc.text(priceFormatted, rowX, startY + 6, { width: colWidthPrice, align: 'center' });
                    rowX += colWidthPrice;
                } else {
                  // Jika data habis (kotak kosong), gambar border kotak kosong supaya grid tetap rapi
                  doc.rect(rowX, startY, colWidthDate, rowHeight).stroke();
                  rowX += colWidthDate;
                  doc.rect(rowX, startY, colWidthPrice, rowHeight).stroke();
                  rowX += colWidthPrice;
                }
            }
            startY += rowHeight;
        }

        // Setelah menggambar semua baris pada halaman ini, gambar border luar tabel agar terlihat rapih
        const tableHeight = rowHeight * (1 + rowsNeeded); // header + rows
        doc.rect(startX, headerStartY, tableTotalWidth, tableHeight).stroke();

        // Footer dihapus sesuai permintaan (tidak menampilkan timestamp)
      }
    }

    doc.end();

  } catch (error) {
    console.error('[Export PDF Komoditas] Error:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

export default router;

// --- Temporary debug endpoint (no auth) ---
// Use this to verify proxy/frontend -> backend parameter forwarding during debugging.
router.get('/debug-export-pdf-komoditas', (req, res) => {
  console.log('[Export PDF Komoditas][DEBUG] received query:', req.query);
  res.json({ ok: true, query: req.query });
});