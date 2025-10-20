// src/components/StorageWarning.tsx
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Database, Download, X } from 'lucide-react';
import * as api from '@/api';

interface StorageStats {
  dataSize: number;
  storageSize: number;
  maxSize: number;
  percentage: number;
  freeSpace: number;
  warning: boolean;
  critical: boolean;
}

export function StorageWarning() {
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchStorageStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStorageStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStorageStats = async () => {
    try {
      const res = await api.get('/stats/storage');
      if (res.ok && res.storage) {
        setStorage(res.storage);
      }
    } catch (e) {
      console.error('[Storage Warning] Failed to fetch:', e);
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

  // Don't show if loading, dismissed, or below warning threshold
  if (loading || dismissed || !storage || !storage.warning) {
    return null;
  }

  const variant = storage.critical ? 'destructive' : 'default';
  const Icon = storage.critical ? AlertTriangle : Database;

  return (
    <Alert variant={variant} className="relative mb-4">
      <Icon className="h-5 w-5" />
      <div className="font-semibold mb-2">
        {storage.critical 
          ? '⚠️ Storage Almost Full!' 
          : '⚠️ Storage Warning'
        }
      </div>
      <AlertDescription className="space-y-2">
        <p>
          Database menggunakan <strong>{storage.percentage}%</strong> dari kapasitas ({formatBytes(storage.dataSize)} / {formatBytes(storage.maxSize)})
        </p>
        <p className="text-sm">
          {storage.critical ? (
            <>
              🚨 <strong>Action Required:</strong> Segera backup dan archive data lama untuk menghindari kehilangan data.
            </>
          ) : (
            <>
              💡 <strong>Recommended:</strong> Pertimbangkan untuk backup dan archive data lebih dari 6 bulan.
            </>
          )}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => window.location.href = '/backup'}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
          >
            <Download className="w-4 h-4" />
            Backup Sekarang
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 border rounded text-sm hover:bg-accent"
          >
            Dismiss
          </button>
        </div>
      </AlertDescription>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-accent rounded"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </Alert>
  );
}
