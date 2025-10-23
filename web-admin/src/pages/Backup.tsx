// src/pages/Backup.tsx
import { useEffect, useState } from 'react';
import { Database, HardDrive, FileText, RefreshCw } from 'lucide-react';
import * as api from '@/api';
import BackupExportForm, { type ExportParams } from '@/components/BackupExportForm';
import { fetchReports } from '@/api';
import { exportMarketExcel, exportMonthsStackedSingleSheet, exportMarketsMultiSheet } from '@/utils/exportExcel';
import exportPreview, { exportPreviewMulti } from '@/utils/exportPreview';
import CreateMissingCommoditiesModal from '@/components/CreateMissingCommoditiesModal';

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
  const [missingModalNames, setMissingModalNames] = useState<string[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0); // 0..100
  const [exportMessage, setExportMessage] = useState<string>('');

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
      setExporting(true);
      setExportProgress(2);
      setExportMessage('Memulai export...');
      const marketName = params.marketId === 'all' 
        ? 'Semua Pasar' 
        : markets.find(m => String(m.id) === String(params.marketId))?.nama_pasar || 'Unknown';

      console.log('[Backup Export] Starting export for:', marketName);
      console.log('[Backup Export] Params:', params);

      // Fetch all data berdasarkan filter dengan pagination
      const PAGE = 500;
      let page = 1;
      let allData: any[] = [];
      
      let estimatedTotal = 0;
      for (;;) {
        setExportMessage(`Mengambil data... halaman ${page}`);
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
        // Update progress if total available
        if (res.total && res.total > 0) {
          estimatedTotal = res.total;
          const fetched = Math.min(allData.length, res.total);
          const pct = Math.round((fetched / res.total) * 60); // use up to 60% for fetching
          setExportProgress(Math.max(exportProgress, pct));
        } else {
          // if no total, increase progress incrementally
          setExportProgress((p) => Math.min(60, p + Math.round((rows.length / PAGE) * 10)));
        }
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
  setExportMessage('Menyusun data untuk export...');
  setExportProgress(65);

      // If the fetched data contains multiple markets, export one sheet per market (match preview)
      try {
        const marketsSeen = new Set(flat.map((r: any) => r.pasar || r.market || r.market_name || 'Unknown Market'));
        if (marketsSeen.size > 1) {
          const byMarket = new Map<string, any[]>();
          for (const row of flat) {
            const marketNameKey = row.pasar || 'Unknown Market';
            if (!byMarket.has(marketNameKey)) byMarket.set(marketNameKey, []);
            byMarket.get(marketNameKey)!.push(row);
          }

          const marketsArray = Array.from(byMarket.entries()).map(([marketNameKey, itemsForMarket]) => {
            // group by month
            const monthsMap = new Map<number, any[]>();
            for (const r of itemsForMarket) {
              const iso = String(r.tanggal || '').slice(0,10);
              if (!iso) continue;
              const mm = Number(iso.slice(5,7));
              if (!monthsMap.has(mm)) monthsMap.set(mm, []);
              monthsMap.get(mm)!.push(r);
            }

            const tables = Array.from(monthsMap.entries()).sort((a,b)=>a[0]-b[0]).map(([mm, items]) => {
              const headerSet = new Set<string>();
              for (const r of items) if (r.komoditas) headerSet.add(r.komoditas);
              const headersLocal = Array.from(headerSet);

              const byDate = new Map<string, any>();
              for (const r of items) {
                const tanggal = r.tanggal;
                if (!byDate.has(tanggal)) byDate.set(tanggal, { tanggal, byCommodity: {} });
                const entry = byDate.get(tanggal);
                entry.byCommodity[r.komoditas] = Number(r.harga || 0);
              }
              const builtRows = Array.from(byDate.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([, v]) => {
                const date = v.tanggal; const day = new Date(date).getDate(); const week = [1,8,15,22,29].includes(day) ? weekRomanForDay(day) : '';
                const base: any = { week, day };
                for (const h of headersLocal) base[h] = Number(v.byCommodity[h] ?? 0);
                return base;
              });

              const monthLabel = items[0] ? monthLabelFromISO(items[0].tanggal.slice(0,10)) : '';
              const title = `${marketNameKey} — ${monthLabel}`;
              return { title, monthLabel, rows: builtRows, headers: headersLocal, units: headersLocal.map(() => '(Rp/Kg)') };
            });

            return { name: marketNameKey, tables };
          });

          // Check missing commodities across all headers
          const allHeaders = new Set<string>();
          for (const m of marketsArray) for (const t of m.tables) for (const h of (t.headers || [])) allHeaders.add(h);
          try {
            const kc = await api.getCommodities();
            const list = Array.isArray((kc as any).rows) ? (kc as any).rows : Array.isArray(kc) ? (kc as any) : [];
            const existingNames = new Set(list.map((k: any) => k.nama_komoditas || k.name || k.nama).filter(Boolean));
            const missing = Array.from(allHeaders).filter((h) => !existingNames.has(h));
            if (missing.length > 0) {
              setMissingModalNames(missing);
              return; // wait for modal to create commodities
            }
          } catch (e) {
            console.warn('[Backup Export] failed checking commodities for multi-market export', e);
          }

          // Export one sheet per market
          const fileName = params.startDate && params.endDate ? `semua-pasar-${params.startDate.slice(0,7)}_to_${params.endDate.slice(0,7)}.xlsx` : `semua-pasar.xlsx`;
          setExportMessage('Mempersiapkan file Excel...');
          setExportProgress(80);
          await exportMarketsMultiSheet({ markets: marketsArray, fileName });
          setExportProgress(100);
          setExportMessage('Selesai. Memulai download...');
          setTimeout(() => { setExporting(false); setExportProgress(0); setExportMessage(''); }, 1200);
          return;
        }
      } catch (err) {
        console.warn('[Backup Export] multi-market automatic export failed', err);
      }

      // Special case: export ALL markets for a single selected YEAR -> produce stacked tables per market per month
      // Detect single-year range from params.startDate & params.endDate
      try {
        const startYear = params.startDate ? Number(String(params.startDate).slice(0,4)) : null;
        const endYear = params.endDate ? Number(String(params.endDate).slice(0,4)) : null;
        if (params.marketId === 'all' && startYear && endYear && startYear === endYear) {
          const year = startYear;
          const tables: Array<{ title: string; monthLabel: string; rows: any[] }> = [];

          // Use already-fetched `flat` to group by market and month (avoid re-fetch per market)
          const byMarket = new Map<string, any[]>();
          for (const row of flat) {
            const iso = String(row.tanggal || '').slice(0,10);
            if (!iso) continue;
            const y = Number(iso.slice(0,4));
            if (y !== year) continue;
            const marketNameKey = row.pasar || 'Unknown Market';
            if (!byMarket.has(marketNameKey)) byMarket.set(marketNameKey, []);
            byMarket.get(marketNameKey).push(row);
          }

          for (const [marketNameKey, itemsForMarket] of Array.from(byMarket.entries())) {
            // group itemsForMarket by month
            const monthsMap = new Map<number, any[]>();
            for (const r of itemsForMarket) {
              const iso = String(r.tanggal || '').slice(0,10);
              if (!iso) continue;
              const mm = Number(iso.slice(5,7));
              if (!monthsMap.has(mm)) monthsMap.set(mm, []);
              monthsMap.get(mm).push(r);
            }

            for (const [mm, items] of Array.from(monthsMap.entries()).sort((a,b)=>a[0]-b[0])) {
              const headerSet = new Set<string>();
              for (const r of items) if (r.komoditas) headerSet.add(r.komoditas);
              const headers = Array.from(headerSet);

              const byDate = new Map<string, any>();
              for (const r of items) {
                const tanggal = r.tanggal;
                if (!byDate.has(tanggal)) byDate.set(tanggal, { tanggal, byCommodity: {} });
                const entry = byDate.get(tanggal);
                entry.byCommodity[r.komoditas] = Number(r.harga || 0);
              }
              const builtRows = Array.from(byDate.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([, v]) => {
                const date = v.tanggal; const day = new Date(date).getDate(); const week = [1,8,15,22,29].includes(day) ? weekRomanForDay(day) : '';
                const base: any = { week, day };
                for (const h of headers) base[h] = Number(v.byCommodity[h] ?? 0);
                return base;
              });

              const monthLabel = monthLabelFromISO(items[0].tanggal.slice(0,10));
              const title = `${marketNameKey} — ${monthLabel}`;
              tables.push({ title, monthLabel, rows: builtRows });
            }
          }

          if (tables.length === 0) {
            alert('Tidak ada data untuk tahun yang dipilih.');
            return;
          }

          // Convert collected tables (which are per-market-per-month) into markets structure
          const marketsForExport = new Map<string, { name: string; tables: any[] }>();
          for (const t of tables) {
            const [marketName] = t.title.split(' — ');
            if (!marketsForExport.has(marketName)) marketsForExport.set(marketName, { name: marketName, tables: [] });
            marketsForExport.get(marketName)!.tables.push({ title: t.title, monthLabel: t.monthLabel, rows: t.rows });
          }

          const marketsArray = Array.from(marketsForExport.values());
          // export one sheet per market
          await exportMarketsMultiSheet({ markets: marketsArray, fileName: `semua-pasar-${year}.xlsx` });
          return;
        }
      } catch (err) {
        console.warn('[Backup Export] multi-market export failed', err);
      }

      // Build dynamic headers and rows (similar to Dashboard)
      const headerSet = new Set<string>();
      for (const r of flat) {
        if (r.komoditas) headerSet.add(r.komoditas);
      }
      const headers = Array.from(headerSet);

      // Check missing commodities: open modal to create them if any
      try {
        const kc = await api.getCommodities();
        const list = Array.isArray((kc as any).rows) ? (kc as any).rows : Array.isArray(kc) ? (kc as any) : [];
        const existingNames = new Set(list.map((k: any) => k.nama_komoditas || k.name || k.nama).filter(Boolean));
        const missing = headers.filter((h) => !existingNames.has(h));
        if (missing.length > 0) {
          setMissingModalNames(missing);
          // export will continue after modal's onCreated triggers
          return;
        }
      } catch (e) {
        console.warn('[Backup Export] check/create commodities failed', e);
      }

      const byDate = new Map<string, any>();
      for (const r of flat) {
        const tanggal = r.tanggal;
        if (!byDate.has(tanggal)) byDate.set(tanggal, { tanggal, byCommodity: {} });
        const entry = byDate.get(tanggal);
        entry.byCommodity[r.komoditas] = Number(r.harga || 0);
      }
      const builtRows = Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, v]) => {
          const date = v.tanggal;
          const day = new Date(date).getDate();
          const week = [1, 8, 15, 22, 29].includes(day) ? weekRomanForDay(day) : '';
          const base: any = { week, day };
          for (const h of headers) base[h] = Number(v.byCommodity[h] ?? 0);
          return base;
        });

      const monthLabel = builtRows[0] ? monthLabelFromISO((allData[0]?.tanggal || params.startDate || new Date().toISOString()).slice(0,10)) : monthLabelFromISO(new Date().toISOString().slice(0,10));
      const units = headers.map(() => '(Rp/Kg)');

      setExportMessage('Mempersiapkan file Excel...');
      setExportProgress(80);
      await exportMarketExcel({
        title: `Harga Pasar Bahan Pangan Tingkat Produsen di ${marketName} ${monthLabel.split(' ')[1]}`,
        monthLabel,
        rows: builtRows,
        headers,
        units,
        fileName: `${marketName.toLowerCase().replace(/\s+/g, '-')}-${params.startDate ? params.startDate.slice(0, 7) : new Date().toISOString().slice(0, 7)}.xlsx`,
      });
      setExportProgress(100);
      setExportMessage('Selesai. Memulai download...');
      setTimeout(() => { setExporting(false); setExportProgress(0); setExportMessage(''); }, 1200);
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

  // ===== Delete whole year across all markets =====
  const [deleteYear, setDeleteYear] = useState<string>(new Date().getFullYear().toString());
  const [deletePreviewCount, setDeletePreviewCount] = useState<number | null>(null);
  const [deletingYear, setDeletingYear] = useState(false);
  const [deleteProgressPct, setDeleteProgressPct] = useState(0);
  const [deleteMessage, setDeleteMessage] = useState('');

  const handlePreviewDeleteYear = async () => {
    if (!deleteYear) return alert('Pilih tahun yang akan di-preview.');
    try {
      setDeletePreviewCount(null);
      setDeleteMessage('Menghitung jumlah baris yang akan dihapus...');
      const y = Number(deleteYear);

      // normalize markets to an array; if not available, fetch from API
      let marketsList: any[] = Array.isArray(markets) ? markets : Array.isArray((markets as any)?.rows) ? (markets as any).rows : [];
      if (!marketsList || marketsList.length === 0) {
        try {
          const fetched = await api.get('/api/markets');
          marketsList = Array.isArray(fetched) ? fetched : Array.isArray((fetched as any)?.rows) ? (fetched as any).rows : [];
          if (marketsList.length > 0) setMarkets(marketsList);
        } catch (e) {
          console.warn('[PreviewDeleteYear] failed to fetch markets', e);
        }
      }
      if (!marketsList || marketsList.length === 0) {
        alert('Daftar pasar kosong. Tidak dapat melakukan preview.');
        setDeleteMessage('');
        return;
      }

      const totalCalls = marketsList.length * 12;
      let done = 0;
      let total = 0;
      for (const m of marketsList) {
        const marketId = Number(m.id ?? m._id ?? m.value ?? 0);
        for (let mm = 1; mm <= 12; mm++) {
          try {
            const res = await api.previewBulkDelete({ marketId, year: y, month: mm });
            total += Number(res.total || 0);
          } catch (err) {
            // ignore individual preview errors but log
            console.warn('[PreviewDeleteYear] preview failed for', m, mm, err);
          }
          done++;
          setDeleteProgressPct(Math.round((done / totalCalls) * 100));
        }
      }
      setDeletePreviewCount(total);
      setDeleteMessage(`Total baris yang akan dihapus: ${total.toLocaleString()}`);
      setTimeout(() => setDeleteProgressPct(0), 800);
    } catch (e: any) {
      console.error('[PreviewDeleteYear] error', e);
      alert('Gagal preview: ' + (e?.message || e));
    }
  };

  const handleDeleteYear = async () => {
    if (!deleteYear) return alert('Pilih tahun yang akan dihapus.');
    if (!confirm(`Konfirmasi: hapus SEMUA data untuk tahun ${deleteYear} di semua pasar? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      setDeletingYear(true);
      setDeleteMessage('Memulai penghapusan...');
      const y = Number(deleteYear);

      // normalize markets to array; fetch if needed
      let marketsList: any[] = Array.isArray(markets) ? markets : Array.isArray((markets as any)?.rows) ? (markets as any).rows : [];
      if (!marketsList || marketsList.length === 0) {
        try {
          const fetched = await api.get('/api/markets');
          marketsList = Array.isArray(fetched) ? fetched : Array.isArray((fetched as any)?.rows) ? (fetched as any).rows : [];
          if (marketsList.length > 0) setMarkets(marketsList);
        } catch (e) {
          console.warn('[DeleteYear] failed to fetch markets', e);
        }
      }
      if (!marketsList || marketsList.length === 0) {
        alert('Daftar pasar kosong. Tidak dapat melakukan penghapusan.');
        setDeletingYear(false);
        return;
      }

      const totalCalls = marketsList.length * 12;
      let done = 0;
      let totalDeleted = 0;
      for (const m of marketsList) {
        const marketId = Number(m.id ?? m._id ?? m.value ?? 0);
        for (let mm = 1; mm <= 12; mm++) {
          try {
            setDeleteMessage(`Menghapus ${m.nama_pasar || m.name || m.id} bulan ${mm}...`);
            const res = await api.bulkDeleteReports({ marketId, year: y, month: mm });
            totalDeleted += Number(res.deleted || 0);
          } catch (err) {
            console.warn('[DeleteYear] delete failed for', m, mm, err);
          }
          done++;
          setDeleteProgressPct(Math.round((done / totalCalls) * 100));
        }
      }
      setDeleteMessage(`Selesai. Total baris terhapus: ${totalDeleted.toLocaleString()}`);
      setTimeout(() => { setDeletingYear(false); setDeleteProgressPct(0); setDeleteMessage(''); setDeletePreviewCount(null); }, 2000);
    } catch (e: any) {
      console.error('[DeleteYear] error', e);
      alert('Gagal menghapus: ' + (e?.message || e));
      setDeletingYear(false);
      setDeleteProgressPct(0);
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
        {exporting && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${exportProgress}%` }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">{exportMessage || `Progress: ${exportProgress}%`}</p>
          </div>
        )}
        {markets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Memuat daftar pasar...</p>
        ) : (
          <BackupExportForm markets={markets} onExport={handleExport} onPreview={async (params) => {
            try {
              const marketName = params.marketId === 'all' 
                ? 'Semua Pasar' 
                : markets.find(m => String(m.id) === String(params.marketId))?.nama_pasar || 'Unknown';

              // fetch same as handleExport
              const PAGE = 500;
              let page = 1;
              let allData: any[] = [];
              for (;;) {
                const res = await fetchReports({ from: params.startDate || undefined, to: params.endDate || undefined, market: params.marketId === 'all' ? 'all' : Number(params.marketId), sort: 'asc', page, pageSize: PAGE });
                const rows = res.rows || [];
                allData = allData.concat(rows);
                if ((res.total && allData.length >= res.total) || rows.length < PAGE) break;
                page += 1;
              }

              if (allData.length === 0) { alert('Tidak ada data untuk preview dengan filter yang dipilih.'); return; }

              const flat = allData.map((r: any) => ({ tanggal: r.date || r.tanggal, pasar: r.market || r.pasar || r.marketName || r.market_name, komoditas: r.commodity || r.komoditas || r.commodityName || r.commodity_name, harga: Number(r.price ?? r.harga ?? 0) }));

              // Build dynamic headers and rows for the combined preview
              const headerSet = new Set<string>();
              for (const r of flat) { if (r.komoditas) headerSet.add(r.komoditas); }
              const headers = Array.from(headerSet);

              const byDate = new Map<string, any>();
              for (const r of flat) {
                const tanggal = r.tanggal;
                if (!byDate.has(tanggal)) byDate.set(tanggal, { tanggal, byCommodity: {} });
                const entry = byDate.get(tanggal);
                entry.byCommodity[r.komoditas] = Number(r.harga || 0);
              }
              const builtRows = Array.from(byDate.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([, v]) => {
                const date = v.tanggal; const day = new Date(date).getDate(); const week = [1,8,15,22,29].includes(day) ? weekRomanForDay(day) : '';
                const base: any = { week, day };
                for (const h of headers) base[h] = Number(v.byCommodity[h] ?? 0);
                return base;
              });

              const monthLabel = builtRows[0] ? monthLabelFromISO((allData[0]?.tanggal || params.startDate || new Date().toISOString()).slice(0,10)) : monthLabelFromISO(new Date().toISOString().slice(0,10));
              const units = headers.map(() => '(Rp/Kg)');

              // If fetched data contains more than one market, show multi-market preview grouped by market
              try {
                const marketsSeen = new Set(flat.map((r: any) => r.pasar || 'Unknown Market'));
                if (marketsSeen.size > 1) {
                  const byMarket = new Map<string, any[]>();
                  for (const row of flat) {
                    const marketNameKey = row.pasar || 'Unknown Market';
                    if (!byMarket.has(marketNameKey)) byMarket.set(marketNameKey, []);
                    byMarket.get(marketNameKey)!.push(row);
                  }

                  const marketsPreview = Array.from(byMarket.entries()).map(([marketNameKey, itemsForMarket]) => {
                    // group itemsForMarket by month
                    const monthsMap = new Map<number, any[]>();
                    for (const r of itemsForMarket) {
                      const iso = String(r.tanggal || '').slice(0,10);
                      if (!iso) continue;
                      const mm = Number(iso.slice(5,7));
                      if (!monthsMap.has(mm)) monthsMap.set(mm, []);
                      monthsMap.get(mm)!.push(r);
                    }

                    const tables = Array.from(monthsMap.entries())
                      .sort((a,b) => a[0] - b[0])
                      .map(([mm, items]) => {
                        const headerSetLocal = new Set<string>();
                        for (const r of items) if (r.komoditas) headerSetLocal.add(r.komoditas);
                        const headersLocal = Array.from(headerSetLocal);

                        const byDateLocal = new Map<string, any>();
                        for (const r of items) {
                          const tanggal = r.tanggal;
                          if (!byDateLocal.has(tanggal)) byDateLocal.set(tanggal, { tanggal, byCommodity: {} });
                          const entry = byDateLocal.get(tanggal);
                          entry.byCommodity[r.komoditas] = Number(r.harga || 0);
                        }
                        const builtRowsLocal = Array.from(byDateLocal.entries())
                          .sort((a,b) => a[0].localeCompare(b[0]))
                          .map(([, v]) => {
                            const date = v.tanggal; const day = new Date(date).getDate(); const week = [1,8,15,22,29].includes(day) ? weekRomanForDay(day) : '';
                            const base: any = { week, day };
                            for (const h of headersLocal) base[h] = Number(v.byCommodity[h] ?? 0);
                            return base;
                          });

                        const monthLabelLocal = items[0] ? monthLabelFromISO(items[0].tanggal.slice(0,10)) : '';
                        return { monthLabel: monthLabelLocal, headers: headersLocal, units: headersLocal.map(() => '(Rp/Kg)'), rows: builtRowsLocal };
                      });

                    return { name: marketNameKey, tables };
                  });

                  exportPreviewMulti({ title: `Preview Harga - Semua Pasar`, yearLabel: '', markets: marketsPreview });
                  return;
                }
              } catch (e) {
                console.warn('[Backup Preview] multi-market preview failed', e);
              }

              exportPreview({ title: `Preview Harga - ${marketName}`, monthLabel, headers, units, rows: builtRows });
            } catch (e) {
              console.error('[Backup Preview] error', e);
              alert('Gagal membuat preview. Lihat console.');
            }
          }} />
        )}

      {missingModalNames && (
        <CreateMissingCommoditiesModal
          names={missingModalNames}
          onClose={() => setMissingModalNames(null)}
          onCreated={async (created) => {
            setMissingModalNames(null);
            if (created && created.length > 0) {
              await new Promise((r) => setTimeout(r, 300));
              // retry last export action: for simplicity, call handleExport with a safe default
              // Note: BackupExportForm will pass params; here we just refresh page or notify user to re-run export
              alert('Komoditas dibuat. Silakan ulangi tindakan Export/Preview untuk melanjutkan.');
            }
          }}
        />
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
        <div className="space-y-3">
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

          <div className="border-t pt-3">
            <p className="font-semibold text-red-600 mb-2">Hapus Semua Data Tahun</p>
            <div className="flex gap-2 items-center">
              <input type="number" value={deleteYear} onChange={(e)=>setDeleteYear(e.target.value)} className="px-3 py-2 border rounded w-28" />
              <button onClick={handlePreviewDeleteYear} className="px-3 py-2 bg-yellow-100 border rounded">Preview</button>
              <button onClick={handleDeleteYear} disabled={deletingYear} className="px-3 py-2 bg-red-600 text-white rounded">{deletingYear ? 'Menghapus...' : 'Hapus Tahun'}</button>
            </div>
            {deleteMessage && <p className="text-sm text-muted-foreground mt-2">{deleteMessage}</p>}
            {deletePreviewCount !== null && <p className="text-sm mt-1">Estimasi baris yang akan dihapus: <strong>{deletePreviewCount.toLocaleString()}</strong></p>}
            {deleteProgressPct > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-red-600" style={{ width: `${deleteProgressPct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{deleteProgressPct}%</p>
              </div>
            )}
          </div>
        </div>
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
