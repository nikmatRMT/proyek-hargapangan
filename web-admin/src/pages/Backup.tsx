// src/pages/Backup.tsx
import { useEffect, useState } from 'react';
import { Database, HardDrive, FileText, RefreshCw, Trash2 } from 'lucide-react';
import * as api from '@/api';
import BackupExportForm, { type ExportParams } from '@/components/BackupExportForm';

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
      // For Phase 2, we'll use backend endpoint for export
      // This will be implemented in next step
      alert(`📥 Export akan dimulai dengan parameter:\n\n` +
        `Tanggal: ${params.startDate || 'Semua'} - ${params.endDate || 'Semua'}\n` +
        `Pasar: ${params.marketId === 'all' ? 'Semua Pasar' : markets.find(m => m.id === params.marketId)?.nama_pasar}\n\n` +
        `Backend endpoint /api/backup/export akan dibuat di commit berikutnya.`
      );
      
      // TODO: Implement backend endpoint
      // const query = new URLSearchParams();
      // if (params.startDate) query.append('startDate', params.startDate);
      // if (params.endDate) query.append('endDate', params.endDate);
      // if (params.marketId !== 'all') query.append('market_id', params.marketId);
      // 
      // const blob = await api.post(`/api/backup/export?${query}`);
      // saveBlob(blob, 'backup-harga.xlsx');
    } catch (error: any) {
      console.error('[Backup] Export error:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm(
      '⚠️ PERHATIAN!\n\nFitur Delete Data akan menghapus data permanen dari database.\n\nUntuk saat ini, gunakan MongoDB Atlas Dashboard untuk mengelola data.\n\nLanjutkan ke MongoDB Atlas?'
    );
    
    if (confirm) {
      window.open('https://cloud.mongodb.com', '_blank');
    }
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
        <h1 className="text-2xl font-bold mb-6">💾 Backup & Storage</h1>
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
        <h1 className="text-2xl font-bold mb-6">💾 Backup & Storage</h1>
        <div className="text-center py-12 text-red-600">
          <p>Gagal memuat data storage. Refresh halaman atau hubungi admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💾 Backup & Storage Management</h1>
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
          <p className="text-sm text-muted-foreground">
            {storage.critical ? '🚨 Critical' : storage.warning ? '⚠️ Warning' : '✅ Healthy'}
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
        <p className="text-sm text-muted-foreground mt-2">
          {storage.percentage < 70 && '✅ Storage dalam kondisi baik'}
          {storage.percentage >= 70 && storage.percentage < 85 && '⚠️ Pertimbangkan untuk backup data lama'}
          {storage.percentage >= 85 && '🚨 Segera backup dan archive data!'}
        </p>
      </div>

      {/* Backup Actions */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">🔄 Backup & Export</h2>
        <BackupExportForm markets={markets} onExport={handleExport} />
      </div>

      {/* Delete Data Section */}
      <div className="border rounded-lg p-6 bg-card border-red-200">
        <h2 className="text-lg font-semibold mb-4 text-red-600">🗑️ Delete Data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Hapus data lama untuk mengosongkan storage. Data yang dihapus tidak dapat dikembalikan.
        </p>
        <button
          onClick={handleDelete}
          className="flex items-center gap-3 px-4 py-3 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-red-600"
        >
          <Trash2 className="w-5 h-5" />
          <div className="text-left">
            <p className="font-semibold">Delete Data Bulanan</p>
            <p className="text-sm text-muted-foreground">Kelola dan hapus data dari MongoDB</p>
          </div>
        </button>
      </div>

      {/* Collections Breakdown */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">📊 Collections Breakdown</h2>
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
        <p className="font-semibold text-blue-900 mb-2">💡 Tips:</p>
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
