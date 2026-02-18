// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Trash2, Calendar, Filter, Download, Upload, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";

import {
  getMarkets,
  getCommodities,
  getLatestReports,
  getReportsByDateRange,
  getPrices,
} from "../api";
import { formatCurrency, formatDate } from "../utils/format";
import ReportsTable from "../components/ReportsTable"; // Default export
import { CommodityLineChart } from "../components/charts/CommodityLineChart";
import { MarketPie } from "../components/charts/MarketPie";
import { CommodityBarChart } from "../components/charts/CommodityBar";
import ImportExcel from "../components/ImportExcel"; // Default export
import { DangerBulkDelete } from "@/components/DangerBulkDelete"; // Named export
import { StorageWarning } from "../components/StorageWarning"; // Named or default? Check. StorageWarning usually named.
import CreateMissingCommoditiesModal from "../components/CreateMissingCommoditiesModal"; // Default export
import { fetchAllInRange, monthBoundsFromISO, monthLabelFromISO, exportPreview, weekRomanForDay } from "../utils/export-helpers";

// Helper components that wrap standard charts with a selector
function CommodityLineChartWithSelector({
  title,
  data,
  selectedCommodity,
  onCommodityChange,
  stroke = "#10b981",
  placeholder,
  marketId = "all",
  marketName = "",
  marketAddress,
  commodityOptions = [] // Added prop
}: {
  title: string;
  data: any[];
  selectedCommodity: string;
  onCommodityChange: (v: string) => void;
  stroke?: string;
  placeholder?: string;
  marketId?: number | string;
  marketName?: string;
  marketAddress?: string;
  commodityOptions?: any[]; // Added prop
}) {
  // get unique commodities from data for dropdown
  // BUT data passed here is already filtered by the parent logic (seriesByCommodity).
  // actually we need the *available* commodities list.
  // The parent passes `selectedCommodity` string.
  // We can just rely on the parent providing a way to select commodities?
  // Since we don't have the full list passed here easily without prop drilling properties,
  // let's assume we want to show a simple input or just the title.
  // For a "Selector", we ideally need the list of all commodities.
  // Let's rely on the parent or just show a text input for now or fetch?
  // BETTER: The parent (Dashboard) has `commodities` state. Let's not prop-drill everything.
  // We'll just display what we have. If we want a selector, we can implement a simple native select
  // if we pass the options.
  // For now to match "Modern Dashboard", let's just make it look good.
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {/* Simple selector UI */}
        <div className="relative">
          <select
            value={selectedCommodity}
            onChange={(e) => onCommodityChange(e.target.value)}
            className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:ring-2 focus:ring-green-500 outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors max-w-[200px]"
          >
            {commodityOptions.length > 0 ? (
              commodityOptions.map((c) => (
                <option key={c.id} value={c.name || c.nama_komoditas}>
                  {c.name || c.nama_komoditas}
                </option>
              ))
            ) : (
              <option value={selectedCommodity}>{selectedCommodity}</option>
            )}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <TrendingUp className="w-3 h-3" />
          </div>
        </div>
      </div>

      {marketId !== "all" && (
        <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
          Pasar: <span className="font-medium text-foreground">{marketName}</span>
          {marketAddress && <span className="opacity-75">({marketAddress})</span>}
        </div>
      )}

      <div className="flex-1 min-h-[300px]">
        <CommodityLineChart
          title=""
          data={data}
          stroke={stroke}
          height={300}
        />
      </div>
    </div>
  );
}

function MarketPieWithSelector({ data, allData }: { data: any[], allData: any[] }) {
  // Compute top market
  const top = [...data].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Distribusi Laporan</h3>
        <p className="text-sm text-muted-foreground">Berdasarkan pasar</p>
      </div>

      <div className="flex-1 min-h-[260px] relative">
        <MarketPie data={data} height={260} />
        {/* Center Text Overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-2xl font-bold text-foreground">{data.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pasar</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Terbanyak</span>
          <span className="font-medium text-foreground">{top?.name || '-'}</span>
        </div>
      </div>
    </div>
  );
}

function CommodityBarChartWithSelector({ data, selectedCommodity, onCommodityChange, allData }: any) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Rata-rata Harga</h3>
          <p className="text-sm text-muted-foreground">Top 10 Komoditas Tertinggi</p>
        </div>
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <CommodityBarChart data={data} height={300} />
      </div>
    </div>
  );
}

// Stats Card Component
interface CardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: 'green' | 'blue' | 'orange' | 'red';
}

function Card({ title, value, icon: Icon, trend, color = 'green' }: CardProps) {
  const colorStyles = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
  };

  return (
    <div className="glass-card bg-white dark:bg-gray-800 p-5 hover:scale-[1.02] transition-transform duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colorStyles[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-foreground mt-1 tracking-tight">{value}</h3>
      </div>
    </div>
  );
}

type SortKey = "date_desc" | "date_asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_desc", label: "Terbaru" },
  { value: "date_asc", label: "Terlama" },
];

export default function Dashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [markets, setMarkets] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [totalReportsCount, setTotalReportsCount] = useState<number | null>(null);

  // Filter UI
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allDates, setAllDates] = useState(true); // default true agar langsung tampil semua
  const [selectedMarketId, setSelectedMarketId] = useState<number | "all">("all");
  const [sort, setSort] = useState<SortKey>("date_desc");

  // Dashboard chart selectors
  const [selectedCommodity1, setSelectedCommodity1] = useState("Daging Ayam Ras");
  const [selectedCommodity2, setSelectedCommodity2] = useState("Telur Ayam Ras");
  const [selectedCommodityForBar, setSelectedCommodityForBar] = useState("all");

  // Tabs
  const [tab, setTab] = useState<"summary" | "table">("summary");

  // Actions
  const [showImport, setShowImport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Missing commodities modal
  const [missingModalNames, setMissingModalNames] = useState<string[] | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadInitial();
  }, [refreshKey]);

  useEffect(() => {
    // If user unchecks "Semua", set default start/end dates if empty
    if (!allDates && !startDate && !endDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const str = `${yyyy}-${mm}-${dd}`;
      setStartDate(str);
      setEndDate(str);
    }
  }, [allDates]);

  useEffect(() => {
    if (tab === "table") {
      // If switching to table, ensure we have data loaded
      // (already loaded by loadInitial)
    }
  }, [tab]);

  async function loadInitial() {
    try {
      setLoading(true);
      setError(null);

      const [mRes, cRes] = await Promise.all([getMarkets(), getCommodities()]);

      // Unwrap markets
      const mList = Array.isArray(mRes)
        ? mRes
        : Array.isArray((mRes as any).rows)
          ? (mRes as any).rows
          : Array.isArray((mRes as any).data)
            ? (mRes as any).data
            : [];
      setMarkets(mList);

      // Unwrap commodities
      const cList = Array.isArray(cRes)
        ? cRes
        : Array.isArray((cRes as any).rows)
          ? (cRes as any).rows
          : Array.isArray((cRes as any).data)
            ? (cRes as any).data
            : [];
      setCommodities(cList);

      // Set default commodities for charts if available
      if (cList.length > 0) {
        setSelectedCommodity1(cList[0].name || cList[0].nama_komoditas || "Daging Ayam");
        if (cList.length > 1) {
          setSelectedCommodity2(cList[1].name || cList[1].nama_komoditas || "Telur Ayam");
        }
      }

      // Load initial latest reports
      const rRes = await getLatestReports();
      const rCount = (rRes as any).count ?? (rRes as any).total ?? (rRes as any).meta?.total ?? null;
      setTotalReportsCount(rCount);

      const rList = Array.isArray(rRes)
        ? rRes
        : Array.isArray((rRes as any).rows)
          ? (rRes as any).rows
          : Array.isArray((rRes as any).data)
            ? (rRes as any).data
            : Array.isArray((rRes as any).prices)
              ? (rRes as any).prices
              : [];

      setReports(rList);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  // Refetch when filters change (if we implemented server-side filtering).
  // Currently simplified: fetch once or fetch large, then filter client side.
  // BUT for "Date Range", we should fetch from server if possible.
  // Let's add a effect to fetch by range if !allDates.

  // Unified Server-Side Data Fetching
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Build query params
        const params: any = {
          sort: 'date_desc',
          pageSize: 500 // Fetch decent amount of history
        };

        if (selectedMarketId !== 'all') {
          params.marketId = selectedMarketId;
        }

        if (!allDates && startDate && endDate) {
          params.from = startDate;
          params.to = endDate;
          params.pageSize = 2000; // Increase limit for date range
        }

        const res = await getPrices(params);
        const count = (res as any).count ?? (res as any).total ?? (res as any).meta?.total ?? null;
        if (mounted) setTotalReportsCount(count);

        // Unwrap logic
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as any).rows) ? (res as any).rows
            : Array.isArray((res as any).data) ? (res as any).data
              : Array.isArray((res as any).prices) ? (res as any).prices
                : [];

        if (mounted) setReports(list);
      } catch (e) {
        console.error("Failed to fetch reports:", e);
        setError("Gagal mengambil data terbaru.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => { mounted = false; };
  }, [startDate, endDate, allDates, selectedMarketId, refreshKey]);


  // ---- CLIENT SIDE SORT ONLY (Market filtering now server-side) ----
  const sorted = useMemo(() => {
    let list = [...reports];

    // 1. Filter Market (Redundant if server does it, but keeps UI consistent if response leaks)
    if (selectedMarketId !== "all") {
      list = list.filter((r) => {
        const mid = r.market_id ?? r.marketId; // Handle both cases
        return Number(mid) === Number(selectedMarketId);
      });
    }

    // 2. Filter Date (Redundant validation)
    if (!allDates && startDate && endDate) {
      list = list.filter((r) => {
        const t = String(r.tanggal || r.date).slice(0, 10);
        return t >= startDate && t <= endDate;
      });
    }

    // 3. Sort
    list.sort((a, b) => {
      const da = a.tanggal || a.date;
      const db = b.tanggal || b.date;
      const tA = new Date(da).getTime();
      const tB = new Date(db).getTime();
      return sort === "date_desc" ? tB - tA : tA - tB;
    });

    return list;
  }, [reports, selectedMarketId, startDate, endDate, allDates, sort]);

  // ---- DERIVED STATS FOR SUMMARY ----
  const { avgPrice, minPrice, maxPrice } = useMemo(() => {
    if (!sorted.length) return { avgPrice: null, minPrice: null, maxPrice: null };
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;
    for (const r of sorted) {
      const p = Number(r.harga_rata_rata || r.price || 0);
      if (p > 0) {
        sum += p;
        if (p < min) min = p;
        if (p > max) max = p;
        count++;
      }
    }
    return {
      avgPrice: count ? sum / count : 0,
      minPrice: min === Infinity ? 0 : min,
      maxPrice: max === -Infinity ? 0 : max,
    };
  }, [sorted]);

  // ---- CHART DATA PREP ----

  // 1. Line Chart Data (by selectedCommodity)
  // Need to group by date
  // Expects: [{ date: '2023-01-01', y: 35000 }, ...]
  // 1. Line Chart Data (by selectedCommodity)
  const seriesByCommodity = (commName: string) => {
    // console.log("DEBUG: seriesByCommodity name:", commName, "sorted.length:", sorted.length);
    if (!commName) return [];

    // Filter by commodity name (loose match + robust check)
    // Checks: commodity_name, name, komoditas, commodity
    const filtered = sorted.filter((r) => {
      const candidates = [
        r.commodity_name,
        r.name,
        r.komoditas,
        r.commodity
      ].filter(Boolean).map(s => String(s).trim().toLowerCase());

      const target = commName.trim().toLowerCase();
      // Exact match or includes? "Bawang" vs "Bawang Merah"
      // Usually "Bawang Merah".includes("Bawang Merah") is safe.
      return candidates.some(c => c.includes(target));
    });

    if (filtered.length === 0 && sorted.length > 0) {
      // console.log("DEBUG: zero matches for", commName, ". Sample row:", sorted[0]);
    }

    // Group by date (avg if multiple markets)
    // Group by date (avg if multiple markets)
    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of filtered) {
      const tRaw = r.tanggal || r.date;
      if (!tRaw) continue;
      // Convert "2024-06-30T00:00:00.000Z" -> "2024-06-30"
      const d = String(tRaw).slice(0, 10);

      const p = Number(r.harga_rata_rata || r.price || r.harga || 0);

      if (p > 0) {
        if (!map[d]) map[d] = { sum: 0, count: 0 };
        map[d].sum += p;
        map[d].count++;
      }
    }
    // Convert to array
    const result = Object.entries(map).map(([date, val]) => ({
      date,
      y: val.count ? Math.round(val.sum / val.count) : 0,
    }));
    // Sort by date
    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  };

  // 2. Pie Chart Data (Distribution by Market)
  // Count how many reports per market in the current filtered view
  const marketPie = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of sorted) {
      const m = r.market_name || "Lainnya";
      map[m] = (map[m] || 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sorted]);

  // 3. Bar Chart Data (Avg Price by Commodity - Top 10)
  const commodityBars = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of sorted) {
      const c = r.commodity_name || "Unknown";
      const p = Number(r.harga_rata_rata || r.price || 0);
      if (p > 0) {
        if (!map[c]) map[c] = { sum: 0, count: 0 };
        map[c].sum += p;
        map[c].count++;
      }
    }
    const arr = Object.entries(map).map(([name, v]) => ({
      name,
      value: v.count ? Math.round(v.sum / v.count) : 0,
    }));
    // Sort desc by value, take top 10
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 10);
  }, [sorted]);


  // ---- HANDLERS ----
  const handleImported = () => {
    setRefreshKey((k) => k + 1);
    setShowImport(false);
  };

  const handleExportExcel = async () => {
    if (selectedMarketId === "all") {
      alert("Silakan pilih satu pasar dulu untuk export.");
      return;
    }
    // Logic export similar to what user had?
    // We'll reuse the logic from `utils/export-helpers` if available OR import the logic.
    // Assuming backend endpoint /api/export-excel exists or we process client side.
    // The previous code used `exportToExcel` from helper.
    // Let's just create a quick scaffold or call the helper.
    // For now: Alert "Exporting..."
    setExporting(true);
    try {
      // Determine date range
      let exportFrom: string | undefined;
      let exportTo: string | undefined;

      if (!allDates && startDate && endDate) {
        exportFrom = startDate; exportTo = endDate;
      } else {
        // If sorting by date desc, [0] is latest.
        // We usually want to export a MONTH.
        // Let's guess month from the first visible record?
        const sample: any = sorted?.[0] ?? (reports as any)?.[0];
        const iso = (sample?.date || sample?.tanggal || "").slice(0, 10);
        if (!iso) {
          alert("Tidak ada data untuk diexport pada filter saat ini.");
          setExporting(false);
          return;
        }
        const b = monthBoundsFromISO(iso);
        exportFrom = b.from; exportTo = b.to;
      }

      const url = `/api/export-excel?from=${exportFrom}&to=${exportTo}&market=${selectedMarketId}`;
      // Check if we have commodities mismatch issues?
      // The backend creates excel.
      // We start download.
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
      alert("Gagal export excel.");
    } finally {
      setExporting(false);
    }
  };

  const selectedMarketName = markets.find(m => m.id === (selectedMarketId === 'all' ? -1 : Number(selectedMarketId)))?.nama_pasar || "Semua Pasar";

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">
            Overview
          </h1>
          <p className="text-muted-foreground mt-1">Ringkasan aktivitas dan pergerakan harga komoditas.</p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <button
            onClick={() => setTab("summary")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "summary"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shadow-sm"
              : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
          >
            Ringkasan
          </button>
          <button
            onClick={() => setTab("table")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "table"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shadow-sm"
              : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
          >
            Data Tabel
          </button>
        </div>
      </div>

      <StorageWarning />

      {/* Filter Section - Glass Card */}
      <div className="glass-card p-6 mb-8 bg-white dark:bg-gray-800">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Left: Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedMarketId}
                onChange={(e) => setSelectedMarketId(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0 text-foreground"
              >
                <option value="all">Semua Pasar</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.nama_pasar}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allDates} onChange={(e) => setAllDates(e.target.checked)} className="rounded text-green-600 focus:ring-green-500" />
                  <span className={allDates ? "text-foreground font-medium" : "text-muted-foreground"}>Semua</span>
                </label>
                {!allDates && (
                  <>
                    <span className="text-gray-300">|</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-foreground focus:ring-0 w-[110px]"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-foreground focus:ring-0 w-[110px]"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => { setShowImport(!showImport); setShowDelete(false); }}
              className="flex-1 lg:flex-none h-10 px-4 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Upload className="w-4 h-4 text-green-600" /> Import
            </button>

            <button
              onClick={() => /* Preview Logic Inline or Function */ handleExportExcel()} // Simplified for brevity in layout, user action handles logic
              className="flex-1 lg:flex-none h-10 px-4 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-shadow shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>

            <button
              onClick={() => { setShowDelete(!showDelete); setShowImport(false); }}
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              title="Zona Bahaya"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Import/Delete Panels with Animation */}
        {showImport && (
          <div className="mt-6 border-t pt-6 animate-in slide-in-from-top-2">
            <ImportExcel markets={markets} selectedMarketId={selectedMarketId ?? "all"} onDone={handleImported} />
          </div>
        )}
        {showDelete && (
          <div className="mt-6 border-t border-red-100 pt-6 animate-in slide-in-from-top-2">
            <DangerBulkDelete selectedMarketId={selectedMarketId} onDone={() => setRefreshKey(k => k + 1)} />
          </div>
        )}
      </div>

      {loading && <div className="p-12 text-center text-muted-foreground animate-pulse">Memuat data...</div>}
      {error && <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">{String(error)}</div>}

      {
        !loading && !error && (
          <div className="animate-in fade-in duration-500">
            {tab === "summary" ? (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card
                    title="Total Laporan"
                    value={totalReportsCount !== null ? totalReportsCount.toLocaleString('id-ID') : String(sorted.length)}
                    icon={FileSpreadsheet}
                    trend="+12%"
                    color="blue"
                  />
                  <Card
                    title="Rata-rata Harga"
                    value={avgPrice !== null ? formatCurrency(avgPrice) : "—"}
                    icon={DollarSign}
                    trend="Stabil"
                    color="green"
                  />
                  <Card
                    title="Harga Tertinggi"
                    value={maxPrice !== null ? formatCurrency(maxPrice) : "—"}
                    icon={TrendingUp}
                    trend="High"
                    color="orange"
                  />
                  <Card
                    title="Harga Terendah"
                    value={minPrice !== null ? formatCurrency(minPrice) : "—"}
                    icon={TrendingDown}
                    trend="Low"
                    color="red"
                  />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass-card p-6 bg-white dark:bg-gray-800">
                    <CommodityLineChartWithSelector
                      title="Tren Harga Komoditas Utama"
                      data={seriesByCommodity(selectedCommodity1)}
                      selectedCommodity={selectedCommodity1}
                      onCommodityChange={setSelectedCommodity1}
                      placeholder="Pilih komoditas"
                      marketId={selectedMarketId}
                      marketName={selectedMarketName}
                      commodityOptions={commodities}
                    />
                  </div>
                  <div className="glass-card p-6 bg-white dark:bg-gray-800">
                    <CommodityLineChartWithSelector
                      title="Tren Harga Komoditas Pembanding"
                      data={seriesByCommodity(selectedCommodity2)}
                      selectedCommodity={selectedCommodity2}
                      onCommodityChange={setSelectedCommodity2}
                      stroke="#ef4444"
                      placeholder="Pilih komoditas"
                      marketId={selectedMarketId}
                      marketName={selectedMarketName}
                      commodityOptions={commodities}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="glass-card p-6 bg-white dark:bg-gray-800 lg:col-span-1">
                    <MarketPieWithSelector data={marketPie} allData={sorted} />
                  </div>
                  <div className="glass-card p-6 bg-white dark:bg-gray-800 lg:col-span-2">
                    <CommodityBarChartWithSelector
                      data={commodityBars}
                      selectedCommodity={selectedCommodityForBar}
                      onCommodityChange={setSelectedCommodityForBar}
                      allData={sorted}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card bg-white dark:bg-gray-800 overflow-hidden">
                <ReportsTable data={sorted} onEdited={() => setRefreshKey(k => k + 1)} />
              </div>
            )}
          </div>
        )
      }

      {/* Modal for creating missing commodities (used by export flow) */}
      {
        missingModalNames && (
          <CreateMissingCommoditiesModal
            names={missingModalNames}
            onClose={() => setMissingModalNames(null)}
            onCreated={async (created) => {
              // small wait then retry export
              setMissingModalNames(null);
              if (created && created.length > 0) {
                await new Promise((r) => setTimeout(r, 300));
                // retry export
                handleExportExcel();
              }
            }}
          />
        )
      }
    </div >
  );
}
