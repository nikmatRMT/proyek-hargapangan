// src/components/BackupExportForm.tsx
import { useState } from 'react';
import { FileSpreadsheet, Calendar, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Market {
  id: string;
  nama_pasar: string;
}

interface BackupExportFormProps {
  markets: Market[];
  onExport: (params: ExportParams) => Promise<void>;
  onPreview?: (params: ExportParams) => Promise<void>;
}

export interface ExportParams {
  startDate: string;
  endDate: string;
  marketId: string; // 'all' or specific market id
}

export default function BackupExportForm({ markets, onExport, onPreview }: BackupExportFormProps) {
  const [allDates, setAllDates] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [marketId, setMarketId] = useState('all');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!allDates && (!startDate || !endDate)) {
      alert('Pilih rentang tanggal atau centang "Semua tanggal"');
      return;
    }

    if (!allDates && new Date(startDate) > new Date(endDate)) {
      alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
      return;
    }

    setExporting(true);
    try {
      await onExport({
        startDate: allDates ? '' : startDate,
        endDate: allDates ? '' : endDate,
        marketId,
      });
    } catch (error: any) {
      console.error('[BackupExport] Error:', error);
      alert('Gagal export: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const setQuickPreset = (preset: 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const now = new Date();
    let start: Date, end: Date;

    switch (preset) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setAllDates(false);
  };

  return (
    <div className="space-y-4">
      {/* Date Range */}
      <div>
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={allDates}
            onChange={(e) => setAllDates(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="font-medium">Semua tanggal</span>
        </label>

        {!allDates && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">
                <Calendar className="inline w-4 h-4 mr-1" />
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">
                <Calendar className="inline w-4 h-4 mr-1" />
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        )}

        {/* Quick Presets */}
        {!allDates && (
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickPreset('thisMonth')}
            >
              Bulan Ini
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickPreset('lastMonth')}
            >
              Bulan Lalu
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickPreset('thisYear')}
            >
              Tahun Ini
            </Button>
          </div>
        )}
      </div>

      {/* Market Filter */}
      <div>
        <label className="block text-sm mb-1 text-muted-foreground">
          <Store className="inline w-4 h-4 mr-1" />
          Pasar
        </label>
        <select
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="all">Semua Pasar</option>
          {Array.isArray(markets) && markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nama_pasar}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={async () => {
            if (!onPreview) return handleExport();
            setExporting(true);
            try {
              await onPreview({ startDate: allDates ? '' : startDate, endDate: allDates ? '' : endDate, marketId });
            } catch (e: any) {
              console.error('[Preview] Error:', e);
              alert('Gagal membuat preview: ' + (e?.message || e));
            } finally { setExporting(false); }
          }}
          disabled={exporting}
          className="flex-1"
          size="lg"
          variant="outline"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Preview
        </Button>

        <Button
          onClick={handleExport}
          disabled={exporting}
          className="flex-1"
          size="lg"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          {exporting ? 'Mengekspor...' : 'Export ke Excel'}
        </Button>

        <Button
          onClick={async () => {
            if (!allDates && (!startDate || !endDate)) {
              alert('Pilih rentang tanggal atau centang "Semua tanggal"');
              return;
            }
            if (!allDates && new Date(startDate) > new Date(endDate)) {
              alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
              return;
            }
            setExporting(true);
            try {
              const params = {
                from: allDates ? '' : startDate,
                to: allDates ? '' : endDate,
                market: marketId,
              };
              // Use dedicated backup-all endpoint when 'Semua Pasar' selected
              const urlBase = marketId === 'all' ? '/api/export-pdf-backup-all' : '/api/export-pdf';
              const url = `${urlBase}?from=${params.from}&to=${params.to}&market=${params.market}`;
              const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Accept': 'application/pdf' },
              });
              if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                  const errorData = await response.json();
                  if (errorData.error) errorMsg = errorData.error;
                } catch (e) {}
                throw new Error(errorMsg);
              }
              const blob = await response.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = `backup-${marketId}-${params.from || 'all'}-${params.to || 'all'}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(downloadUrl);
              document.body.removeChild(a);
            } catch (error: any) {
              console.error('[Backup PDF] Error:', error);
              alert('Gagal export PDF: ' + (error?.message || error));
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
          className="flex-1"
          size="lg"
          variant="outline"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export ke PDF
        </Button>
      </div>
    </div>
  );
}
