import React, { useState, useEffect } from 'react';
import { buildRowsForExport, monthLabelFromISO, weekRomanForDay } from '../utils/exportUtils';
import { exportMarketExcel, exportCommodityExcel, exportMarketsMultiSheet, exportSimpleTable } from '../utils/exportExcel';
import exportPreview from '../utils/exportPreview';
import { fetchReports } from '../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, DownloadIcon, FileSpreadsheetIcon, FileTextIcon, Eye, Database, Store, ShoppingBag, History, Users } from 'lucide-react';
import { get, API_BASE } from '@/api';

interface Market {
  id: string | number;
  nama_pasar: string;
  alamat?: string;
}

interface Commodity {
  id: string | number;
  nama_komoditas: string;
}

interface DateRange {
  start: string;
  end: string;
}

const OutputManager = () => {
  // Helper untuk mendapatkan rentang bulan saat ini
  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month

    // Format to YYYY-MM-DD
    const isoStart = start.toISOString().slice(0, 10);
    const isoEnd = end.toISOString().slice(0, 10);

    return { from: isoStart, to: isoEnd };
  };

  const [selectedMarket, setSelectedMarket] = useState<string>('Semua Pasar');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('Semua Komoditas');

  // Initialize with current month range by default
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const { from, to } = getCurrentMonthRange();
    return { start: from, end: to };
  });
  const [markets, setMarkets] = useState<Market[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'general' | 'commodity' | 'survey'>('general');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSurveyUser, setSelectedSurveyUser] = useState<string>('all');

  // Custom Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  // Helper formats
  const getRoleLabel = (role: string) => (role === 'admin' ? 'Admin' : 'Petugas');
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        if (data.rows && Array.isArray(data.rows)) {
          setMarkets(data.rows);
        } else {
          console.error('Invalid markets data:', data);
          setMarkets([]);
        }
      } catch (error) {
        console.error('Error fetching markets:', error);
        setMarkets([]);
      }
    };

    const fetchCommodities = async () => {
      try {
        const response = await fetch('/api/commodities');
        const data = await response.json();
        if (data.rows && Array.isArray(data.rows)) {
          setCommodities(data.rows);
        } else {
          console.error('Invalid commodities data:', data);
          setCommodities([]);
        }
      } catch (error) {
        console.error('Error fetching commodities:', error);
        setCommodities([]);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await get('/api/users?role=all');
        const list = Array.isArray((res as any).data) ? (res as any).data : [];
        setUsers(list);
      } catch (e) {
        console.error('Failed to load users', e);
      }
    };


    fetchMarkets();
    fetchCommodities();
    fetchUsers();
  }, []);

  // Effect: Auto-detect latest available data date when market changes
  useEffect(() => {
    const autoSetLatestDate = async () => {
      try {
        setLoading(true);
        // Build query: sort descending by date to get the very last record
        let url = '/api/prices?page=1&pageSize=1&sort=desc';
        if (selectedMarket !== 'Semua Pasar') {
          url += `&marketId=${selectedMarket}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.rows && data.rows.length > 0) {
          const latestRow = data.rows[0];
          const latestDate = latestRow.date || latestRow.tanggal; // "YYYY-MM-DD"

          if (latestDate) {
            // Calculate start of that month
            const d = new Date(latestDate);
            const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
            const isoStart = startOfMonth.toISOString().slice(0, 10);

            console.log(`[AutoDate] Found latest data for market ${selectedMarket}: ${latestDate}`);
            setDateRange({ start: isoStart, end: latestDate });
          }
        } else {
          // No data found? Fallback to current month? 
          // Or keep existing if we don't want to clear it.
          // But if we switched market, maybe we should reset?
          // Let's reset to current month if no data found.
          const curr = getCurrentMonthRange();
          setDateRange({ start: curr.from, end: curr.to });
        }
      } catch (err) {
        console.error('Error fetching latest date:', err);
      } finally {
        setLoading(false);
      }
    };

    autoSetLatestDate();
  }, [selectedMarket]);

  const fetchAllInRange = async (params: { from: string; to: string; marketId: string | number }) => {
    const PAGE_SIZE = 500;
    let page = 1;
    let accumulatedData: any[] = [];

    // Smart default: jika tanggal kosong, gunakan bulan ini
    let { from, to } = params;
    if (!from || !to) {
      const defaults = getCurrentMonthRange();
      if (!from) from = defaults.from;
      if (!to) to = defaults.to;
      console.log('Menggunakan rentang tanggal default:', { from, to });
    }

    // Pastikan marketId valid
    const marketId = params.marketId === 'Semua Pasar' ? undefined : params.marketId;

    for (; ;) {
      // Gunakan fetchReports dari api.ts yang mengarah ke /api/prices yang benar
      const res: any = await fetchReports({
        from,
        to,
        market: marketId,
        sort: 'asc',
        page,
        pageSize: PAGE_SIZE
      });

      const rows = res.rows || [];
      accumulatedData = accumulatedData.concat(rows);

      if ((res.total && accumulatedData.length >= res.total) || rows.length < PAGE_SIZE) break;
      page += 1;
    }

    return accumulatedData;
  };

  const handleExportExcel = async () => {
    if (loading) return;

    try {
      setLoading(true);

      if (selectedMarket === 'Semua Pasar') {
        showNotification('Silakan pilih satu pasar dulu untuk export.', 'error');
        setLoading(false);
        return;
      }

      // Gunakan tanggal yang dipilih atau fallback ke bulan ini di dalam fetchAllInRange
      const allRows = await fetchAllInRange({
        from: dateRange.start,
        to: dateRange.end,
        marketId: selectedMarket,
      });

      if (allRows.length === 0) {
        showNotification('Tidak ada data yang ditemukan untuk rentang tanggal/filter ini.', 'error');
        setLoading(false);
        return;
      }

      // 1. Flatten data (normalize)
      const flat = allRows.map((r: any) => ({
        tanggal: r.date || r.tanggal,
        pasar: r.market || r.pasar || r.marketName || r.market_name,
        komoditas: r.commodity || r.komoditas || r.commodityName || r.commodity_name,
        harga: Number(r.price || r.harga || 0),
      }));

      // 2. Pivot data: Group by Date -> { date, komoditas1: price, komoditas2: price... }
      const headersSet = new Set<string>();
      const byDate = new Map<string, any>();

      for (const r of flat) {
        if (!r.komoditas) continue;
        headersSet.add(r.komoditas);

        const t = r.tanggal;
        if (!byDate.has(t)) {
          const d = new Date(t);
          const day = d.getDate();
          byDate.set(t, {
            week: weekRomanForDay(day),
            day: day,
            // Simpan nilai asli tanggal untuk sorting jika perlu
            _rawDate: t
          });
        }
        const row = byDate.get(t);
        // Map commodity name directly to price
        row[r.komoditas] = r.harga;
      }

      const headers = Array.from(headersSet);

      // Sort rows by date asc
      const rows = Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, val]) => val);

      // Determine dates for label (use actual data or passed params)
      const usedStart = dateRange.start || getCurrentMonthRange().from;
      const usedEnd = dateRange.end || getCurrentMonthRange().to;

      // Get Market Name properly
      const marketName = markets.find((m) => String(m.id) === selectedMarket)?.nama_pasar || selectedMarket;
      const marketAddress = markets.find((m) => String(m.id) === selectedMarket)?.alamat || '-';

      await exportMarketExcel({
        title: `Laporan Harga Pasar - ${marketName}`,
        monthLabel: `${yearMonthLabel(usedStart)}`, // Helper friendly label e.g. "Juli 2024"
        rows: rows,
        fileName: `Laporan_Harga_${marketName.replace(/\s+/g, '_')}.xlsx`,
        headers,
        marketName: marketName,
        marketAddress: marketAddress,
      });

      setLoading(false);
      showNotification('Excel berhasil diekspor!', 'success');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      setLoading(false);
      showNotification('Gagal mengekspor Excel. Cek konsol untuk detail.', 'error');
    }
  };

  // Helper simple untuk label bulan (inline)
  const yearMonthLabel = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch {
      return isoDate;
    }
  };

  const handleExportPDF = async () => {
    if (loading) return;

    try {
      setLoading(true);

      console.log('Filter Parameters:', {
        from: dateRange.start,
        to: dateRange.end,
        market: selectedMarket,
        komoditas: selectedCommodity,
      });

      const response = await fetch(
        `/api/export-pdf?from=${dateRange.start}&to=${dateRange.end}&market=${selectedMarket}&komoditas=${selectedCommodity}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'export.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      setLoading(false);
      showNotification('PDF berhasil diekspor!', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setLoading(false);
      showNotification(error.message || 'Gagal mengekspor PDF.', 'error');
    }
  };

  const handleExportPDFCommodities = async () => {
    if (loading) return;

    try {
      setLoading(true);

      if (!dateRange.start || !dateRange.end) {
        showNotification('Silakan isi tanggal awal dan akhir sebelum mengekspor PDF.', 'error');
        setLoading(false);
        return;
      }

      if (selectedCommodity === 'Semua Komoditas') {
        showNotification('Silakan pilih satu komoditas untuk export PDF.', 'error');
        setLoading(false);
        return;
      }

      // Cari nama komoditas
      const targetCommodityObj = commodities.find(c => String(c.id) === selectedCommodity);
      const targetCommodityName = targetCommodityObj ? targetCommodityObj.nama_komoditas : selectedCommodity;

      const queryParams = new URLSearchParams({
        from: dateRange.start,
        to: dateRange.end,
        market: selectedMarket,
        komoditas: targetCommodityName,
      });

      const response = await fetch(`/api/export-pdf-komoditas?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export PDF for commodities');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Laporan_${targetCommodityName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setLoading(false);
      showNotification('PDF berhasil diekspor!', 'success');
    } catch (error) {
      console.error('Error exporting PDF for commodities:', error);
      setLoading(false);
      showNotification(error.message || 'Gagal mengekspor PDF untuk komoditas.', 'error');
    }
  };

  const handleExportExcelCommodities = async () => {
    if (loading) return;

    try {
      setLoading(true);

      if (selectedMarket === 'Semua Pasar') {
        showNotification('Anda HARUS memilih satu pasar spesifik untuk laporan per komoditas.', 'error');
        setLoading(false);
        return;
      }

      if (!dateRange.start || !dateRange.end) {
        showNotification('Silakan isi tanggal awal dan akhir sebelum mengekspor Excel.', 'error');
        setLoading(false);
        return;
      }

      if (selectedCommodity === 'Semua Komoditas') {
        showNotification('Silakan pilih satu komoditas untuk export Excel.', 'error');
        setLoading(false);
        return;
      }

      // Cari nama komoditas yang dipilih (karena selectedCommodity berisi ID)
      const targetCommodityObj = commodities.find(c => String(c.id) === selectedCommodity);
      const targetCommodityName = targetCommodityObj ? targetCommodityObj.nama_komoditas : selectedCommodity;

      const allRows = await fetchAllInRange({
        from: dateRange.start,
        to: dateRange.end,
        marketId: selectedMarket,
      });

      if (allRows.length === 0) {
        showNotification(`Tidak ada data ${targetCommodityName} di pasar ini.`, 'error');
        setLoading(false);
        return;
      }

      // 1. Flatten
      const flat = allRows.map((r: any) => ({
        tanggal: r.date || r.tanggal,
        pasar: r.market || r.pasar,
        komoditas: r.commodity || r.komoditas || r.commodityName || r.commodity_name,
        harga: Number(r.price || r.harga || 0),
      }));

      // Filter strict by selected commodity NAME
      const filteredFlat = flat.filter(row =>
        String(row.komoditas).toLowerCase().includes(String(targetCommodityName).toLowerCase())
      );

      if (filteredFlat.length === 0) {
        showNotification(`Data ditemukan tapi tidak ada yang cocok dengan komoditas: ${targetCommodityName}`, 'error');
        setLoading(false);
        return;
      }

      // 2. Pivot: Group by Date
      const byDate = new Map<string, any>();

      for (const r of filteredFlat) {
        const t = r.tanggal;
        if (!byDate.has(t)) {
          const d = new Date(t);
          const day = d.getDate();
          byDate.set(t, {
            week: weekRomanForDay(day),
            day: day,
            _rawDate: t
          });
        }
        const row = byDate.get(t);
        row[r.komoditas] = r.harga;
      }

      // Headers: dynamically get all commodity names found
      const headersSet = new Set<string>();
      filteredFlat.forEach(r => headersSet.add(r.komoditas));
      const headers = Array.from(headersSet);

      // Sort rows by date asc
      const rows = Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, val]) => val);

      // Get Market Name properly
      const marketName = markets.find((m) => String(m.id) === selectedMarket)?.nama_pasar || selectedMarket;
      const marketAddress = markets.find((m) => String(m.id) === selectedMarket)?.alamat || '-';

      // Use actual date range from data or filter
      const usedStart = dateRange.start || getCurrentMonthRange().from;

      // Call the multi-column layout exporter
      await exportCommodityExcel({
        marketName: marketName,
        marketAddress: marketAddress,
        commodityName: targetCommodityName,
        rows: rows,
        fileName: `Laporan_${targetCommodityName.replace(/\s+/g, '_')}_${marketName.replace(/\s+/g, '_')}.xlsx`,
      });

      setLoading(false);
      showNotification('Excel berhasil diekspor!', 'success');
    } catch (error) {
      console.error('Error exporting Excel for commodities:', error);
      setLoading(false);
      showNotification('Gagal mengekspor Excel untuk komoditas.', 'error');
    }
  };

  const handleExportAverage = async (mode: 'all-markets' | 'per-market') => {
    if (loading) return;
    try {
      setLoading(true);

      if (!dateRange.start || !dateRange.end) {
        showNotification('Silakan isi tanggal awal dan akhir sebelum mengekspor.', 'error');
        setLoading(false);
        return;
      }

      // Force fetch ALL markets regardless of selection for this report type
      // OR fetch specific if user really wants?
      // "Rata-rata Harga Komoditas dari Smua Pasar" implies All Markets.
      // But if user selected a market, they might think it filters.
      // For "all-markets" mode (Average of everything), we fetch ALL.
      // For "per-market" mode (Matrix), we fetch ALL to populate columns.
      // So fetch marketId=undefined.

      const allRows = await fetchAllInRange({
        from: dateRange.start,
        to: dateRange.end,
        marketId: 'Semua Pasar', // Force all
      });

      if (allRows.length === 0) {
        showNotification('Tidak ada data ditemukan.', 'error');
        setLoading(false);
        return;
      }

      const { exportAveragePriceExcel } = await import('../utils/exportExcel');

      if (mode === 'all-markets') {
        // Aggregation: Average per Commodity across ALL data
        const map = new Map<string, { sum: number, count: number }>();
        allRows.forEach((r: any) => {
          const comm = r.commodity || r.komoditas || r.commodityName || 'Lainnya';
          const p = Number(r.price || r.harga || 0);
          if (p > 0) {
            const entry = map.get(comm) || { sum: 0, count: 0 };
            entry.sum += p;
            entry.count++;
            map.set(comm, entry);
          }
        });
        const data = Array.from(map.entries()).map(([k, v]) => ({
          commodity: k,
          avg: Math.round(v.sum / v.count)
        })).sort((a, b) => b.avg - a.avg);

        await exportAveragePriceExcel({
          mode: 'all-markets',
          data,
          title: `Rata-rata Harga Komoditas (Semua Pasar) ${dateRange.start} - ${dateRange.end}`,
          fileName: `RataRata_SemuaPasar_${dateRange.start}.xlsx`
        });
      } else {
        // Per Market Matrix
        // Aggregation: Average per Commodity PER Market
        const map = new Map<string, { sum: number, count: number }>();
        allRows.forEach((r: any) => {
          const comm = r.commodity || r.komoditas || r.commodityName || 'Lainnya';
          const mkt = r.market || r.pasar || r.marketName || 'Lainnya';
          const p = Number(r.price || r.harga || 0);
          if (p > 0) {
            const key = `${comm}###${mkt}`;
            const entry = map.get(key) || { sum: 0, count: 0 };
            entry.sum += p;
            entry.count++;
            map.set(key, entry);
          }
        });
        const data: any[] = [];
        map.forEach((v, k) => {
          const [commodity, market] = k.split('###');
          data.push({
            commodity,
            market,
            avg: Math.round(v.sum / v.count)
          });
        });
        // Sort by commodity ? export helper handles it.

        await exportAveragePriceExcel({
          mode: 'per-market',
          data,
          title: `Rata-rata Harga Komoditas Per Pasar ${dateRange.start} - ${dateRange.end}`,
          fileName: `RataRata_PerPasar_${dateRange.start}.xlsx`
        });
      }

      setLoading(false);
      showNotification('Laporan Rata-rata berhasil diekspor!', 'success');
    } catch (e) {
      console.error(e);
      setLoading(false);
      showNotification('Gagal export rata-rata.', 'error');
    }
  };

  const handlePreview = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const allRows = await fetchAllInRange({
        from: dateRange.start,
        to: dateRange.end,
        marketId: selectedMarket,
      });

      if (allRows.length === 0) {
        showNotification('Tidak ada data untuk dipreview.', 'error');
        setLoading(false);
        return;
      }

      // Format for preview (reuse logic)
      const flat = allRows.map((r: any) => ({
        tanggal: r.date || r.tanggal,
        pasar: r.market || r.pasar || r.marketName || r.market_name,
        komoditas: r.commodity || r.komoditas || r.commodityName || r.commodity_name,
        harga: Number(r.price ?? r.harga ?? 0),
      }));

      const headerSet = new Set<string>();
      for (const r of flat) if (r.komoditas) headerSet.add(r.komoditas);
      const headers = Array.from(headerSet);

      const byDate = new Map<string, any>();
      for (const r of flat) {
        const tanggal = r.tanggal;
        if (!byDate.has(tanggal)) byDate.set(tanggal, { tanggal, byCommodity: {} });
        const entry = byDate.get(tanggal);
        entry.byCommodity[r.komoditas] = Number(r.harga || 0);
      }
      const builtRows = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => {
        const date = v.tanggal; const day = new Date(date).getDate(); const week = [1, 8, 15, 22, 29].includes(day) ? weekRomanForDay(day) : '';
        const base: any = { week, day };
        for (const h of headers) base[h] = Number(v.byCommodity[h] ?? 0);
        return base;
      });

      const monthLabel = builtRows[0] ? monthLabelFromISO((allRows[0]?.tanggal || dateRange.start || new Date().toISOString()).slice(0, 10)) : '';
      const units = headers.map(() => '(Rp/Kg)');
      const marketName = markets.find((m) => String(m.id) === selectedMarket)?.nama_pasar || selectedMarket;

      exportPreview({ title: `Preview - ${marketName}`, monthLabel, headers, units, rows: builtRows });
      setLoading(false);
    } catch (e) {
      console.error(e);
      showNotification('Gagal preview.', 'error');
      setLoading(false);
    }
  };

  const handleBackupExport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Fetch data (often huge)
      const allRows = await fetchAllInRange({
        from: dateRange.start,
        to: dateRange.end,
        marketId: selectedMarket,
      });

      if (allRows.length === 0) {
        showNotification('Tidak ada data.', 'error');
        setLoading(false);
        return;
      }

      // If 'Semua Pasar' -> Groups by Market -> Multi-sheet export
      // If Specific Market -> Single sheet export (same as General Report but maybe user wants it here too)

      const flat = allRows.map((r: any) => ({
        tanggal: r.date || r.tanggal,
        pasar: r.market || r.pasar || r.marketName || r.market_name,
        komoditas: r.commodity || r.komoditas || r.commodityName || r.commodity_name,
        harga: Number(r.price ?? r.harga ?? 0),
      }));

      // Logic from Backup.tsx buildMarketsArray inline adaptation
      const byMarket = new Map<string, any[]>();
      for (const r of flat) {
        const marketNameKey = String(r.pasar || '').trim() || 'Unknown Market';
        if (!byMarket.has(marketNameKey)) byMarket.set(marketNameKey, []);
        byMarket.get(marketNameKey)!.push(r);
      }

      const marketsArray: Array<{ name: string; tables: any[] }> = [];
      for (const [marketNameKey, itemsForMarket] of Array.from(byMarket.entries())) {
        const monthsMap = new Map<string, any[]>();
        for (const r of itemsForMarket) {
          const iso = String(r.tanggal || '').slice(0, 10);
          if (!iso) continue;
          const monthISO = iso.slice(0, 7);
          if (!monthsMap.has(monthISO)) monthsMap.set(monthISO, []);
          monthsMap.get(monthISO)!.push(r);
        }

        const tables = Array.from(monthsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([monthISO, items]) => {
          const headerSet = new Set<string>();
          for (const r of items) if (r.komoditas) headerSet.add(r.komoditas);
          const headersLocal = Array.from(headerSet).sort();

          const byDate = new Map<string, any>();
          for (const r of items) {
            const tanggal = r.tanggal;
            if (!byDate.has(tanggal)) byDate.set(tanggal, { tanggal, byCommodity: {} });
            const entry = byDate.get(tanggal);
            entry.byCommodity[r.komoditas] = Number(r.harga || 0);
          }

          const builtRows = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => {
            const date = v.tanggal; const day = new Date(date).getDate(); const week = [1, 8, 15, 22, 29].includes(day) ? weekRomanForDay(day) : '';
            const base: any = { week, day };
            for (const h of headersLocal) base[h] = Number(v.byCommodity[h] ?? 0);
            return base;
          });

          const monthLabel = items[0] ? monthLabelFromISO(items[0].tanggal.slice(0, 10)) : '';
          const title = `${marketNameKey} — ${monthLabel}`;
          return { title, monthLabel, rows: builtRows, headers: headersLocal, units: headersLocal.map(() => '(Rp/Kg)') };
        });

        marketsArray.push({ name: marketNameKey, tables });
      }

      if (marketsArray.length > 0) {
        const fileName = `Backup_SemuaPasar_${dateRange.start}_${dateRange.end}.xlsx`;
        await exportMarketsMultiSheet({ markets: marketsArray, fileName });
        showNotification('Backup Excel (Multi-sheet) berhasil!', 'success');
      }

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      showNotification('Gagal backup Excel.', 'error');
    }
  };

  const handleBackupPDF = async () => {
    // Same as basic PDF but usually implies 'all' markets creates a huge PDF or specific endpoint
    if (loading) return;
    setLoading(true);
    try {
      const urlBase = selectedMarket === 'Semua Pasar' ? '/api/export-pdf-backup-all' : '/api/export-pdf';
      const url = `${urlBase}?from=${dateRange.start}&to=${dateRange.end}&market=${selectedMarket === 'Semua Pasar' ? 'all' : selectedMarket}`;

      const response = await fetch(url, { credentials: 'include', headers: { 'Accept': 'application/pdf' } });
      if (!response.ok) throw new Error('PDF generation failed');

      const blob = await response.blob();
      const u = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `Backup_PDF_${dateRange.start}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(u);

      showNotification('Backup PDF berhasil!', 'success');
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      showNotification('Gagal backup PDF.', 'error');
    }
  };

  const handleExportSurveyHistory = (type: 'pdf' | 'excel') => {
    if (loading) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // Gunakan dateRange dari state default
      if (dateRange.start) params.append('from', dateRange.start);
      if (dateRange.end) params.append('to', dateRange.end);
      if (selectedSurveyUser && selectedSurveyUser !== 'all') params.append('userId', selectedSurveyUser);

      const url = `${API_BASE}/api/survey-history/export/${type}?${params.toString()}`;

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.click();

      showNotification(`Export Survey History (${type.toUpperCase()}) dimulai...`, 'success');
      setLoading(false);
    } catch (e) {
      setLoading(false);
      showNotification('Gagal export survey history', 'error');
    }
  };

  const handleExportMarketsList = async (type: 'excel' | 'pdf') => {
    if (loading) return;
    if (markets.length === 0) return showNotification('Data pasar kosong.', 'error');
    setLoading(true);
    try {
      if (type === 'excel') {
        const dataToExport = markets.map((r, i) => ({
          No: i + 1,
          ID: r.id,
          'Nama Pasar': r.nama_pasar,
          Alamat: r.alamat || '-'
        }));
        await exportSimpleTable({
          title: 'Daftar Pasar',
          headers: ['No', 'ID', 'Nama Pasar', 'Alamat'],
          data: dataToExport.map(Object.values),
          fileName: 'Daftar_Pasar.xlsx',
          columns: [
            { width: 5, alignment: { horizontal: 'center' } },
            { width: 10, alignment: { horizontal: 'center' } },
            { width: 30, alignment: { horizontal: 'left' } },
            { width: 60, alignment: { horizontal: 'left', wrapText: true } }
          ]
        });
        showNotification('Daftar Pasar (Excel) berhasil diekspor.', 'success');
      } else {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text('Daftar Pasar', 14, 15);
        doc.setFontSize(10); doc.text(`Total: ${markets.length} pasar`, 14, 22);
        (autoTable as any)(doc, {
          startY: 25,
          head: [['No', 'ID', 'Nama Pasar', 'Alamat']],
          body: markets.map((r, i) => [i + 1, r.id, r.nama_pasar, r.alamat || '-']),
          theme: 'grid',
          headStyles: { fillColor: [22, 163, 74] }
        });
        doc.save('Daftar_Pasar.pdf');
        showNotification('Daftar Pasar (PDF) berhasil diekspor.', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showNotification('Gagal export daftar pasar.', 'error');
    } finally { setLoading(false); }
  };

  const handleExportCommoditiesList = async (type: 'excel' | 'pdf') => {
    if (loading) return;
    if (commodities.length === 0) return showNotification('Data komoditas kosong.', 'error');
    setLoading(true);
    try {
      if (type === 'excel') {
        const dataToExport = commodities.map((r, i) => ({
          No: i + 1,
          ID: r.id,
          'Nama Komoditas': r.nama_komoditas
        }));
        await exportSimpleTable({
          title: 'Daftar Komoditas',
          headers: ['No', 'ID', 'Nama Komoditas'],
          data: dataToExport.map(Object.values),
          fileName: 'Daftar_Komoditas.xlsx',
          columns: [
            { width: 5, alignment: { horizontal: 'center' } },
            { width: 10, alignment: { horizontal: 'center' } },
            { width: 40, alignment: { horizontal: 'left' } }
          ]
        });
        showNotification('Daftar Komoditas (Excel) berhasil diekspor.', 'success');
      } else {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text('Daftar Komoditas', 14, 15);
        doc.setFontSize(10); doc.text(`Total: ${commodities.length} komoditas`, 14, 22);
        (autoTable as any)(doc, {
          startY: 25,
          head: [['No', 'ID', 'Nama Komoditas']],
          body: commodities.map((r, i) => [i + 1, r.id, r.nama_komoditas]),
          theme: 'grid',
          headStyles: { fillColor: [234, 88, 12] } // Orange-600
        });
        doc.save('Daftar_Komoditas.pdf');
        showNotification('Daftar Komoditas (PDF) berhasil diekspor.', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showNotification('Gagal export daftar komoditas.', 'error');
    } finally { setLoading(false); }
  };

  const handleExportUsersList = async (type: 'excel' | 'pdf') => {
    if (loading) return;
    if (users.length === 0) return showNotification('Data petugas kosong.', 'error');
    setLoading(true);
    try {
      if (type === 'excel') {
        const dataToExport = users.map((u, i) => ({
          No: i + 1,
          Nama: u.name,
          Username: u.username,
          NIP: u.nip ?? '-',
          Role: getRoleLabel(u.role),
          Status: u.is_active ? 'Aktif' : 'Tidak Aktif',
          'Tanggal Bergabung': formatDate(u.created_at)
        }));

        await exportSimpleTable({
          title: 'Daftar Petugas',
          headers: ['No', 'Nama', 'Username', 'NIP', 'Role', 'Status', 'Tanggal Bergabung'],
          data: dataToExport.map(Object.values),
          fileName: `Daftar_Petugas_${new Date().toISOString().slice(0, 10)}.xlsx`,
          columns: [
            { width: 5, alignment: { horizontal: 'center' } },
            { width: 25 },
            { width: 15 },
            { width: 20 },
            { width: 10, alignment: { horizontal: 'center' } },
            { width: 10, alignment: { horizontal: 'center' } },
            { width: 15, alignment: { horizontal: 'center' } }
          ]
        });
        showNotification('Daftar Petugas (Excel) berhasil diekspor.', 'success');
      } else {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text('Daftar Petugas HARPA', 14, 15);
        doc.setFontSize(10); doc.text(`Total: ${users.length} pengguna`, 14, 22);

        const headers = [['No', 'Nama', 'Username', 'NIP', 'Role', 'Status', 'Bergabung']];
        const data = users.map((u, i) => [
          i + 1,
          u.name,
          u.username,
          u.nip ?? '-',
          getRoleLabel(u.role),
          u.is_active ? 'Aktif' : 'Non-Aktif',
          formatDate(u.created_at)
        ]);

        (autoTable as any)(doc, {
          startY: 25,
          head: headers,
          body: data,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }, // Blue-500
          styles: { fontSize: 9 },
        });

        doc.save(`Daftar_Petugas.pdf`);
        showNotification('Daftar Petugas (PDF) berhasil diekspor.', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showNotification('Gagal export daftar petugas.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
          {notification.type === 'success' ? (
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
          ) : (
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
          )}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}

      {/* Header Standard */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DownloadIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              Output Manager
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Pusat pengelolaan ekspor laporan harga dan data komoditas
            </p>
          </div>
        </div>
      </header>

      {/* Content Section */}
      <main className="p-8 max-w-7xl mx-auto">
        <div className="space-y-6">

          {/* Filter Section (Full Width) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded-full block"></span>
              Filter Data
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="market-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pasar</Label>
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                  <SelectTrigger id="market-select" className="w-full bg-white dark:bg-gray-900">
                    <span className="truncate">
                      {selectedMarket === 'Semua Pasar'
                        ? 'Semua Pasar'
                        : markets.find(m => String(m.id) === selectedMarket)?.nama_pasar || 'Pilih Pasar'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Pasar">Semua Pasar</SelectItem>
                    {markets.map((market) => (
                      <SelectItem key={market.id} value={String(market.id)}>
                        {market.nama_pasar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commodity-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Komoditas</Label>
                <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                  <SelectTrigger id="commodity-select" className="w-full bg-white dark:bg-gray-900">
                    <span className="truncate">
                      {selectedCommodity === 'Semua Komoditas'
                        ? 'Semua Komoditas'
                        : commodities.find(c => String(c.id) === selectedCommodity)?.nama_komoditas || 'Pilih Komoditas'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Komoditas">Semua Komoditas</SelectItem>
                    {commodities.map((commodity) => (
                      <SelectItem key={commodity.id} value={String(commodity.id)}>
                        {commodity.nama_komoditas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500 italic mt-1">*Hanya untuk Laporan Spesifik</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-start" className="text-sm font-medium text-gray-700 dark:text-gray-300">Dari Tanggal</Label>
                <div className="relative">
                  <Input
                    id="date-start"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="pl-10 bg-white dark:bg-gray-900"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-end" className="text-sm font-medium text-gray-700 dark:text-gray-300">Sampai Tanggal</Label>
                <div className="relative">
                  <Input
                    id="date-end"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="pl-10 bg-white dark:bg-gray-900"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Export Containers (Grid Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Container 1: Laporan Umum */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                  <span className="w-1 h-6 bg-green-500 rounded-full block"></span>
                  Laporan Umum
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ekspor data lengkap semua komoditas berdasarkan pasar dan rentang waktu.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-green-100 hover:border-green-500 hover:bg-green-50 text-green-700 transition-all group"
                  onClick={handleExportExcel}
                  disabled={loading}
                >
                  <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <FileSpreadsheetIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="font-medium">Export Excel</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-700 transition-all group"
                  onClick={handleExportPDF}
                  disabled={loading}
                >
                  <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <FileTextIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <span className="font-medium">Export PDF</span>
                </Button>
              </div>
            </div>

            {/* Container 2: Laporan Spesifik */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                  <span className="w-1 h-6 bg-indigo-500 rounded-full block"></span>
                  Laporan Spesifik
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ekspor data terfokus hanya untuk <strong>komoditas yang dipilih</strong> di atas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-green-100 hover:border-green-500 hover:bg-green-50 text-green-700 transition-all group"
                  onClick={handleExportExcelCommodities}
                  disabled={loading}
                >
                  <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <FileSpreadsheetIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="font-medium">Excel (Komoditas)</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-700 transition-all group"
                  onClick={handleExportPDFCommodities}
                  disabled={loading}
                >
                  <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <FileTextIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <span className="font-medium">PDF (Komoditas)</span>
                </Button>
              </div>
            </div>

            {/* Container 3: Laporan Rata-rata */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                  <span className="w-1 h-6 bg-orange-500 rounded-full block"></span>
                  Laporan Rata-rata
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ekspor ringkasan rata-rata harga untuk <strong>Semua Pasar</strong> (Komparasi).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 text-blue-700 transition-all group"
                  onClick={() => handleExportAverage('all-markets')}
                  disabled={loading}
                >
                  <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                    <FileSpreadsheetIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="font-medium">Excel (Semua)</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 transition-all group"
                  onClick={() => handleExportAverage('per-market')}
                  disabled={loading}
                >
                  <div className="p-3 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
                    <FileSpreadsheetIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <span className="font-medium">Excel (Per Pasar)</span>
                </Button>
              </div>
            </div>

            {/* Container 4: Daftar Pasar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                  <span className="w-1 h-6 bg-purple-500 rounded-full block"></span>
                  Daftar Pasar
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Unduh daftar lengkap pasar yang terdaftar dalam sistem.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-green-100 hover:border-green-500 hover:bg-green-50 text-green-700 transition-all group"
                  onClick={() => handleExportMarketsList('excel')}
                >
                  <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <FileSpreadsheetIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="font-medium">Excel</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-700 transition-all group"
                  onClick={() => handleExportMarketsList('pdf')}
                >
                  <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <FileTextIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <span className="font-medium">PDF</span>
                </Button>
              </div>
            </div>

            {/* Container 5: Daftar Komoditas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                  <span className="w-1 h-6 bg-purple-500 rounded-full block"></span>
                  Daftar Komoditas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Unduh daftar lengkap komoditas yang terdaftar dalam sistem.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-green-100 hover:border-green-500 hover:bg-green-50 text-green-700 transition-all group"
                  onClick={() => handleExportCommoditiesList('excel')}
                >
                  <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <FileSpreadsheetIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="font-medium">Excel</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-700 transition-all group"
                  onClick={() => handleExportCommoditiesList('pdf')}
                >
                  <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <FileTextIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <span className="font-medium">PDF</span>
                </Button>
              </div>
            </div>

            {/* Container 7: Daftar Petugas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                  <span className="w-1 h-6 bg-blue-500 rounded-full block"></span>
                  Daftar Petugas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Unduh data akun petugas untuk keperluan administrasi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-green-100 hover:border-green-500 hover:bg-green-50 text-green-700 transition-all group"
                  onClick={() => handleExportUsersList('excel')}
                >
                  <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <FileSpreadsheetIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="font-medium">Excel</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-700 transition-all group"
                  onClick={() => handleExportUsersList('pdf')}
                >
                  <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <FileTextIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <span className="font-medium">PDF</span>
                </Button>
              </div>
            </div>

            {/* Container 6: Riwayat Petugas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                  <span className="w-1 h-6 bg-pink-500 rounded-full block"></span>
                  Riwayat Petugas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Laporan aktivitas input harga oleh petugas.
                </p>

                {/* Filter Petugas specific for this card */}
                <div className="mt-4">
                  <Label htmlFor="sp-user" className="text-xs font-medium text-gray-500 mb-1.5 block">Filter Petugas (Opsional)</Label>
                  <Select value={selectedSurveyUser} onValueChange={setSelectedSurveyUser}>
                    <SelectTrigger id="sp-user" className="w-full bg-gray-50 dark:bg-gray-900 h-9 text-sm">
                      <SelectValue placeholder="Semua Petugas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Petugas</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.username || u.name || 'User ' + u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-green-100 hover:border-green-500 hover:bg-green-50 text-green-700 transition-all group"
                  onClick={() => handleExportSurveyHistory('excel')}
                  disabled={loading}
                >
                  <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <FileSpreadsheetIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="font-medium">Excel</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-700 transition-all group"
                  onClick={() => handleExportSurveyHistory('pdf')}
                  disabled={loading}
                >
                  <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <FileTextIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <span className="font-medium">PDF</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Container 4: Backup & Ekspor Massal (Full Width Section) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                <span className="w-1 h-6 bg-gray-500 rounded-full block"></span>
                Backup & Ekspor Massal
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Fitur lanjutan untuk melihat preview data mentah, mencadangkan seluruh data pasar dalam satu file (multi-sheet), atau PDF lengkap.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 transition-all group"
                onClick={handlePreview}
                disabled={loading}
              >
                <div className="p-3 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
                  <Eye className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="font-medium">Preview Data</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-slate-100 hover:border-slate-500 hover:bg-slate-50 text-slate-700 transition-all group"
                onClick={handleBackupExport}
                disabled={loading}
              >
                <div className="p-3 bg-slate-100 rounded-full group-hover:bg-slate-200 transition-colors">
                  <Database className="h-6 w-6 text-slate-600" />
                </div>
                <span className="font-medium">Backup Excel (Full)</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-2 border-orange-100 hover:border-orange-500 hover:bg-orange-50 text-orange-700 transition-all group"
                onClick={handleBackupPDF}
                disabled={loading}
              >
                <div className="p-3 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors">
                  <FileTextIcon className="h-6 w-6 text-orange-600" />
                </div>
                <span className="font-medium">Backup PDF (Full)</span>
              </Button>
            </div>
          </div>

          {/* Loading Overlay */}
          {
            loading && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-100 flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sedang memproses dokumen...</span>
                </div>
              </div>
            )
          }
        </div >
      </main >
    </div >
  );
};

export default OutputManager;