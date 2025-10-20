// src/pages/Backup.tsx
import { useEffect, useState } from 'react';
import { Database, HardDrive, FileText, RefreshCw } from 'lucide-react';
import * as api from '@/api';
import BackupExportForm, { type ExportParams } from '@/components/BackupExportForm';
import { fetchReports } from '@/api';
import { exportMarketExcel } from '@/utils/exportExcel';

/* =========================
   Helper lokal untuk EXPORT (sama dengan Dashboard)
========================= */

// Minggu Romawi per rentang 7 hari
function weekRomanForDay(day: number) {
  const idx = Math.floor((day - 1) / 7); // 0..4
  return ["I", "II", "III", "IV", "V"][Math.min(Math.max(idx, 0), 4)];
}

// Label bulan "Juli 2024" (untuk judul export)
function monthLabelFromISO(dateISO: string) {
  const [y, m] = dateISO.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/** Pemetaan nama komoditas tampilan → key kolom Excel */
const MAP: Record<string, string> = {
  Beras: "beras",
  "Minyak Goreng Kemasan": "minyakGorengKemasan",
  "Minyak Goreng Curah": "minyakGorengCurah",
  "Tepung Terigu Kemasan": "tepungTeriguKemasan",
  "Tepung Terigu Curah": "tepungTeriguCurah",
  "Gula Pasir": "gulaPasir",
  "Telur Ayam": "telurAyam",
  "Daging Sapi": "dagingSapi",
  "Daging Ayam": "dagingAyam",
  Kedelai: "kedelai",
  "Bawang Merah": "bawangMerah",
  "Bawang Putih": "bawangPutih",
  "Cabe Merah Besar": "cabeMerahBesar",
  "Cabe Rawit": "cabeRawit",
  "Ikan Haruan/ Gabus": "ikanHaruan",
  "Ikan Tongkol/Tuna": "ikanTongkol",
  "Ikan Mas/Nila": "ikanMas",
  "Ikan Patin": "ikanPatin",
  "Ikan Papuyu/Betok": "ikanPapuyu",
  "Ikan Bandeng": "ikanBandeng",
  "Ikan Kembung/Pindang": "ikanKembung",
};

type MarketRow = {
  week: string;
  day: number;
  beras: number;
  minyakGorengKemasan: number;
  minyakGorengCurah: number;
  tepungTeriguKemasan: number;
  tepungTeriguCurah: number;
  gulaPasir: number;
  telurAyam: number;
  dagingSapi: number;
  dagingAyam: number;
  kedelai: number;
  bawangMerah: number;
  bawangPutih: number;
  cabeMerahBesar: number;
  cabeRawit: number;
  ikanHaruan: number;
  ikanTongkol: number;
  ikanMas: number;
  ikanPatin: number;
  ikanPapuyu: number;
  ikanBandeng: number;
  ikanKembung: number;
};

function buildRowsForExport(
  flat: any[],
  marketName: string,
  fromISO?: string,
  toISO?: string
) {
  const filtered = flat.filter((r: any) => {
    const tanggal = r.tanggal;  // Use tanggal directly (not date)
    const pasar = r.pasar;      // Use pasar directly (not market)
    if (!tanggal) return false;
    if (marketName !== "Semua Pasar" && pasar !== marketName) return false;
    if (fromISO && tanggal < fromISO) return false;
    if (toISO && tanggal > toISO) return false;
    return true;
  });

  const byDate = new Map<string, MarketRow>();
  for (const r of filtered) {
    const tanggal: string = r.tanggal;  // Use tanggal directly
    const day = new Date(tanggal).getDate();
    if (!byDate.has(tanggal)) {
      byDate.set(tanggal, {
        week: weekRomanForDay(day),
        day,
        beras: 0,
        minyakGorengKemasan: 0,
        minyakGorengCurah: 0,
        tepungTeriguKemasan: 0,
        tepungTeriguCurah: 0,
        gulaPasir: 0,
        telurAyam: 0,
        dagingSapi: 0,
        dagingAyam: 0,
        kedelai: 0,
        bawangMerah: 0,
        bawangPutih: 0,
        cabeMerahBesar: 0,
        cabeRawit: 0,
        ikanHaruan: 0,
        ikanTongkol: 0,
        ikanMas: 0,
        ikanPatin: 0,
        ikanPapuyu: 0,
        ikanBandeng: 0,
        ikanKembung: 0,
      });
    }
    const row = byDate.get(tanggal)!;
    const namaKomoditas: string = r.komoditas || "";  // Use komoditas directly
    const key = MAP[namaKomoditas] as keyof MarketRow | undefined;
    const harga = Number(r.harga ?? 0);  // Use harga directly
    if (key && typeof row[key] === "number") (row[key] as number) = harga;
  }

  const rows = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => {
      const show = [1, 8, 15, 22, 29].includes(v.day);
      return { ...v, week: show ? v.week : "" };
    });

  const firstISO: string | undefined =
    filtered[0]?.tanggal || fromISO || toISO;  // Use tanggal
  const monthLabel = firstISO
    ? monthLabelFromISO(firstISO)
    : monthLabelFromISO(new Date().toISOString().slice(0, 10));

  return { rows, monthLabel };
}

interface StorageStats {
  dataSize: number;
  storageSize: number;
  maxSize: number;
  percentage: number;
  freeSpace: number;
  warning: boolean;
  critical: boolean;
}

interface CollectionStat {
  name: string;
  count: number;
  size: number;
  storageSize: number;
  avgObjSize: number;
}

interface StorageResponse {
  ok: boolean;
  storage: StorageStats;
  collections: CollectionStat[];
  lastUpdated: string;
}

export default function Backup() {
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [collections, setCollections] = useState<CollectionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [markets, setMarkets] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const data = await api.get('/api/markets');
      setMarkets(data || []);
    } catch (e) {
      console.error('[Backup] Failed to fetch markets:', e);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/stats/storage') as StorageResponse;
      if (res.ok) {
        setStorage(res.storage);
        setCollections(res.collections || []);
        setLastUpdated(res.lastUpdated);
      }
    } catch (e: any) {
      console.error('[Backup] Failed to fetch stats:', e);
      alert('Gagal memuat data storage: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (isoString: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleExport = async (params: ExportParams) => {
    try {
      const marketName = params.marketId === 'all' 
        ? 'Semua Pasar' 
        : markets.find(m => String(m.id) === String(params.marketId))?.nama_pasar || 'Unknown';

      console.log('[Backup Export] Starting export for:', marketName);
      console.log('[Backup Export] Params:', params);

      // Fetch all data berdasarkan filter dengan pagination
      const PAGE = 500;
      let page = 1;
      let allData: any[] = [];
      
      for (;;) {
        const res = await fetchReports({
          from: params.startDate || undefined,
          to: params.endDate || undefined,
          market: params.marketId === 'all' ? 'all' : Number(params.marketId),
          sort: 'asc',
          page,
          pageSize: PAGE,
        });
        const rows = res.rows || [];
        allData = allData.concat(rows);
        if ((res.total && allData.length >= res.total) || rows.length < PAGE) break;
        page += 1;
      }

      console.log('[Backup Export] Fetched records:', allData.length);

      if (allData.length === 0) {
        alert('Tidak ada data untuk di-export dengan filter yang dipilih.');
        return;
      }

      // Format data untuk export (format EXACT SAMA dengan Dashboard)
      const flat = allData.map((r: any) => ({
        tanggal: r.date || r.tanggal,
        pasar: r.market || r.pasar || r.marketName || r.market_name,
        komoditas: r.commodity || r.komoditas || r.commodityName || r.commodity_name,
        harga: Number(r.price ?? r.harga ?? 0),
      }));

      console.log('[Backup Export] Sample flat data:', flat.slice(0, 3));

      // Build rows dengan fungsi yang sama dengan Dashboard
      const { rows, monthLabel } = buildRowsForExport(
        flat,
        marketName,
        params.startDate || undefined,
        params.endDate || undefined
      );

      console.log('[Backup Export] Built rows:', rows.length);
      console.log('[Backup Export] Sample row:', rows[0]);
      console.log('[Backup Export] Month label:', monthLabel);

      // Export dengan format yang sama
      await exportMarketExcel({
        title: `Harga Pasar Bahan Pangan Tingkat Produsen di ${marketName} ${
          monthLabel.split(" ")[1]
        }`,
        monthLabel,
        rows,
        fileName: `${marketName.toLowerCase().replace(/\s+/g, "-")}-${
          params.startDate ? params.startDate.slice(0, 7) : new Date().toISOString().slice(0, 7)
        }.xlsx`,
      });

      console.log('[Backup Export] Export completed successfully!');
    } catch (error: any) {
      console.error('[Backup] Export error:', error);
      alert('Gagal export: ' + error.message);
      throw error;
    }
  };

  const handleGoToDashboard = () => {
    // Redirect ke Dashboard dengan hash untuk auto-scroll ke delete section
    window.location.href = '/#delete';
  };

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 85) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 85) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Backup & Storage</h1>
        </div>
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Memuat data storage...</p>
        </div>
      </div>
    );
  }

  if (!storage) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Backup & Storage</h1>
        </div>
        <div className="text-center py-12 text-red-600">
          <p>Gagal memuat data storage. Refresh halaman atau hubungi admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Backup & Storage Management</h1>
        </div>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-bold">{formatBytes(storage.dataSize)}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            dari {formatBytes(storage.maxSize)} (MongoDB Free Tier)
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-3">
            <HardDrive className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Free Space</p>
              <p className="text-2xl font-bold">{formatBytes(storage.freeSpace)}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Tersisa untuk data baru
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-muted-foreground">Usage</p>
              <p className={`text-2xl font-bold ${getStatusColor(storage.percentage)}`}>
                {storage.percentage}%
              </p>
            </div>
          </div>
          <p className={`text-sm font-medium ${storage.critical ? 'text-red-600' : storage.warning ? 'text-yellow-600' : 'text-green-600'}`}>
            {storage.critical ? 'Critical' : storage.warning ? 'Warning' : 'Healthy'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold">Storage Capacity</p>
          <p className="text-sm text-muted-foreground">
            Last updated: {formatDate(lastUpdated)}
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full ${getProgressColor(storage.percentage)} transition-all`}
            style={{ width: `${Math.min(storage.percentage, 100)}%` }}
          />
        </div>
        <p className={`text-sm font-medium mt-2 ${
          storage.percentage < 70 ? 'text-green-700' : 
          storage.percentage < 85 ? 'text-yellow-700' : 
          'text-red-700'
        }`}>
          {storage.percentage < 70 && 'Storage dalam kondisi baik'}
          {storage.percentage >= 70 && storage.percentage < 85 && 'Pertimbangkan untuk backup data lama'}
          {storage.percentage >= 85 && 'Segera backup dan archive data!'}
        </p>
      </div>

      {/* Backup Actions */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Backup & Export</h2>
        </div>
        {markets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Memuat daftar pasar...</p>
        ) : (
          <BackupExportForm markets={markets} onExport={handleExport} />
        )}
      </div>

      {/* Delete Data Section */}
      <div className="border rounded-lg p-6 bg-card border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-600">Delete Data</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Hapus data lama untuk mengosongkan storage. Data yang dihapus tidak dapat dikembalikan.
        </p>
        <button
          onClick={handleGoToDashboard}
          className="flex items-center gap-3 px-4 py-3 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-red-600 w-full"
        >
          <Database className="w-5 h-5" />
          <div className="text-left flex-1">
            <p className="font-semibold">Delete Data Bulanan</p>
            <p className="text-sm text-muted-foreground">Buka Dashboard untuk hapus data per bulan & pasar</p>
          </div>
          <span className="text-sm">→</span>
        </button>
      </div>

      {/* Collections Breakdown */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold">Collections Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-semibold">Collection</th>
                <th className="text-right p-3 font-semibold">Documents</th>
                <th className="text-right p-3 font-semibold">Data Size</th>
                <th className="text-right p-3 font-semibold">Storage Size</th>
                <th className="text-right p-3 font-semibold">Avg Doc Size</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((col) => (
                <tr key={col.name} className="border-t hover:bg-muted/50">
                  <td className="p-3 font-mono text-sm">{col.name}</td>
                  <td className="p-3 text-right">{col.count.toLocaleString()}</td>
                  <td className="p-3 text-right">{formatBytes(col.size)}</td>
                  <td className="p-3 text-right">{formatBytes(col.storageSize)}</td>
                  <td className="p-3 text-right text-sm text-muted-foreground">
                    {formatBytes(col.avgObjSize)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
        <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Tips:
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Backup data secara berkala untuk mencegah kehilangan data</li>
          <li>Archive data lebih dari 6-12 bulan untuk menghemat storage</li>
          <li>MongoDB Free Tier memiliki limit 512MB - gunakan Google Drive untuk archive jangka panjang</li>
          <li>Data yang di-archive tetap bisa di-restore kapan saja</li>
        </ul>
      </div>
    </div>
  );
}
