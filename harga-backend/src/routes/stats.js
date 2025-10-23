// src/routes/stats.js
import { Router } from 'express';
import { getDb } from '../tools/db.js';

const router = Router();

/**
 * GET /api/stats/storage
 * Returns MongoDB storage statistics
 * Auth: Admin only
 */
router.get('/storage', async (req, res) => {
  try {
    // Check admin auth
    if (req.session?.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const db = getDb();
    // Get database stats (dbStats command)
    const stats = await db.command({ dbStats: 1 });
    const maxSize = 512 * 1024 * 1024; // 512MB free tier
    const dataSize = stats.dataSize || 0;
    const storageSize = stats.storageSize || 0;
    const percentage = ((dataSize / maxSize) * 100).toFixed(2);

    // Calculate collections breakdown using collStats command
    const collections = await db.listCollections().toArray();
    const collectionStats = [];

    for (const col of collections) {
      try {
        // Use collStats command instead of .stats()
        const colStats = await db.command({ collStats: col.name });
        collectionStats.push({
          name: col.name,
          count: colStats.count || 0,
          size: colStats.size || 0,
          storageSize: colStats.storageSize || 0,
          avgObjSize: colStats.avgObjSize || 0,
        });
      } catch (e) {
        console.warn(`Failed to get stats for ${col.name}:`, e.message);
      }
    }

    // Sort by size desc
    collectionStats.sort((a, b) => b.size - a.size);

    res.json({
      ok: true,
      storage: {
        dataSize,
        storageSize,
        maxSize,
        percentage: parseFloat(percentage),
        freeSpace: maxSize - dataSize,
        warning: percentage > 70,
        critical: percentage > 85,
      },
      collections: collectionStats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[Storage Stats] Error:', e);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to fetch storage stats',
      error: e.message 
    });
  }
});

/**
 * GET /api/stats/summary
 * Returns overall system statistics
 * Auth: Admin only
 */
router.get('/summary', async (req, res) => {
  try {
    if (req.session?.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const db = getDb();
    
    // Get collection counts
    const collections = {
      users: await db.collection('users').countDocuments(),
      pasar: await db.collection('pasar').countDocuments(),
      komoditas: await db.collection('komoditas').countDocuments(),
      laporan_harga: await db.collection('laporan_harga').countDocuments(),
    };

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentReports = await db.collection('laporan_harga').countDocuments({
      created_at: { $gte: thirtyDaysAgo }
    });

    res.json({
      ok: true,
      summary: {
        totalUsers: collections.users,
        totalMarkets: collections.pasar,
        totalCommodities: collections.komoditas,
        totalReports: collections.laporan_harga,
        recentReports: recentReports,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[Summary Stats] Error:', e);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to fetch summary stats',
      error: e.message 
    });
  }
});

export default router;
