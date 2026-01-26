const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { requireAuth } = require('../middleware/requireAuth');
const { drawTable } = require('../lib/pdfUtils'); // Assuming drawTable is in lib/pdfUtils.js
const { getDb, initMongo } = require('../tools/db');

// Ensure MongoDB is initialized
initMongo();

// GET /api/export-pdf-per-pasar
router.get('/export-pdf-per-pasar', requireAuth, async (req, res) => {
  try {
    // Tambahkan validasi untuk memastikan endpoint ini tidak memengaruhi /export-pdf-komoditas
    if (req.path === '/export-pdf-komoditas') {
      return res.status(400).json({ error: 'Endpoint ini tidak mendukung format komoditas.' });
    }

    const { from, to, market } = req.query;

    // Build filter
    const filter = {};
    if ((from && from !== '') || (to && to !== '')) {
      filter.tanggal_lapor = {};
      if (from && from !== '') filter.tanggal_lapor.$gte = String(from).slice(0, 10);
      if (to && to !== '') filter.tanggal_lapor.$lte = String(to).slice(0, 10);
    }
    if (market && market !== 'all') {
      filter.market_id = Number(market);
    }

    const db = getDb();
    const marketData = await db.collection('markets').find(filter).toArray();
    const laporanHarga = await db.collection('laporan_harga').find(filter).toArray();

    console.log('[Export PDF Per Pasar] Filter:', filter);
    console.log('[Export PDF Per Pasar] Market Data:', marketData);
    console.log('[Export PDF Per Pasar] Price Data:', laporanHarga);

    if (!marketData || marketData.length === 0) {
      return res.status(404).json({ error: 'No data found for the given filters.' });
    }

    if (!laporanHarga || laporanHarga.length === 0) {
      return res.status(404).json({ error: 'No price data found for the given filters.' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 20, layout: 'landscape' });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="export-pasar-${market || 'all'}.pdf"`);
      res.setHeader('Content-Length', pdfData.length);
      res.send(pdfData);
    });

    // Generate PDF content
    const topLimit = doc.page.margins.top;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = 90; // Column width
    const rowHeight = 28; // Row height
    const left = doc.page.margins.left;

    const byDate = {};
    laporanHarga.forEach((record) => {
      const dateISO = record.tanggal_lapor?.toISOString?.()?.slice(0, 10) || new Date(record.tanggal_lapor).toISOString().slice(0, 10);
      if (!byDate[dateISO]) {
        byDate[dateISO] = { tanggal: dateISO, harga: record.harga };
      }
    });

    const rows = Object.values(byDate);

    marketData.forEach((data) => {
      const marketName = data.nama_pasar || `Pasar ${data.market_id}`;
      const marketAddress = data.alamat || '';

      doc.fontSize(15).font('Helvetica-Bold').text(marketName, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(marketAddress, { align: 'center' });
      doc.moveDown();

      // Draw table header
      let x = left;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.rect(x, topLimit, colWidth, rowHeight).fillAndStroke('#1976D2', '#000');
      doc.fillColor('#fff').text('Tanggal', x + 2, topLimit + 7, { width: colWidth - 4, align: 'center' });
      doc.rect(x + colWidth, topLimit, colWidth, rowHeight).fillAndStroke('#1976D2', '#000');
      doc.fillColor('#fff').text('Harga', x + colWidth + 2, topLimit + 7, { width: colWidth - 4, align: 'center' });

      // Draw rows
      rows.forEach((row, rowIdx) => {
        const y = topLimit + rowHeight * (rowIdx + 1);
        doc.rect(x, y, colWidth, rowHeight).stroke();
        doc.rect(x + colWidth, y, colWidth, rowHeight).stroke();
        doc.fontSize(12).fillColor('#000').text(row.tanggal || '-', x + 2, y + 7, { width: colWidth - 4, align: 'center' });
        doc.fontSize(12).fillColor('#000').text(row.harga || '-', x + colWidth + 2, y + 7, { width: colWidth - 4, align: 'center' });
      });

      doc.addPage();
    });

    doc.end();
  } catch (error) {
    console.error('[Export PDF Per Pasar] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;