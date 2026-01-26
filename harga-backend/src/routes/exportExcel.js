import express from 'express';
import { getDb } from '../tools/db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

router.get('/export-excel', requireAuth, async (req, res) => {
  try {
    const { from, to, market, komoditas } = req.query;

    console.log('[Export Excel] Query Parameters:', { from, to, market, komoditas });

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

    const db = getDb();
    const data = await db.collection('laporan_harga').find(filter).toArray();

    if (data.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data untuk di-export' });
    }

    // Generate Excel file (placeholder logic)
    const filename = `laporan-harga-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from('Excel file content')); // Replace with actual Excel generation logic
  } catch (error) {
    console.error('[Export Excel] Error:', error);
    res.status(500).json({ error: 'Gagal mengekspor Excel' });
  }
});

export default router;