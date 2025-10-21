// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Trash2 } from "lucide-react";

import {
  getMarkets,
  fetchReports,
  previewBulkDelete,
  bulkDeleteReports,
  subscribePrices,         // ⬅️ tambahkan
} from "../api"; // ✅ pastikan path benar
import { useReports } from "../hooks/useReports";
import { useReportStats } from "../hooks/useReportStats";
import { formatCurrency } from "../utils/format";
import { exportMarketExcel } from "../utils/exportExcel";
import LegacyDashboard from '@/pages/Dashboard';
import { CommodityLineChart } from "../components/charts/CommodityLineChart";
import { MarketPie } from "../components/charts/MarketPie";
import { CommodityBarChart } from "../components/charts/CommodityBar";
import ReportsTable from "../components/ReportsTable";
import { SORT_OPTIONS, sortReports } from "../constants/sort";
import type { SortKey } from "../constants/sort";
import ImportExcel from "../components/ImportExcel";
import { StorageWarning } from "../components/StorageWarning";

/* =========================
   Helper lokal untuk EXPORT
========================= */

// Minggu Romawi per rentang 7 hari
function weekRomanForDay(day: number) {
  const idx = Math.floor((day - 1) / 7); // 0..4
  return ["I", "II", "III", "IV", "V"][Math.min(Math.max(idx, 0), 4)];
}

// Batas bulan penuh dari ISO "yyyy-mm-dd"
function monthBoundsFromISO(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return { from: toISO(first), to: toISO(last) };
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
    const tanggal = r.date || r.tanggal;
    const pasar = r.market || r.pasar || r.marketName || r.market_name;
    if (!tanggal) return false;
    if (marketName !== "Semua Pasar" && pasar !== marketName) return false;
    if (fromISO && tanggal < fromISO) return false;
    if (toISO && tanggal > toISO) return false;
    return true;
  });

  const byDate = new Map<string, MarketRow>();
  for (const r of filtered) {
    const tanggal: string = r.date || r.tanggal;
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
    const namaKomoditas: string =
      r.commodity || r.komoditas || r.commodityName || r.commodity_name || "";
    const key = MAP[namaKomoditas] as keyof MarketRow | undefined;
    const harga = Number(r.price ?? r.harga ?? 0);
    if (key && typeof row[key] === "number") (row[key] as number) = harga;
  }

  const rows = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => {
      const show = [1, 8, 15, 22, 29].includes(v.day);
      return { ...v, week: show ? v.week : "" };
    });

  const firstISO: string | undefined =
    filtered[0]?.date || filtered[0]?.tanggal || fromISO || toISO;
  const monthLabel = firstISO
    ? monthLabelFromISO(firstISO)
    : monthLabelFromISO(new Date().toISOString().slice(0, 10));

  return { rows, monthLabel };
}

export default function Dashboard() {
  // ====== State umum ======
  const [allDates, setAllDates] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [tab, setTab] = useState<"summary" | "table">("summary");

  // 🔁 kunci refresh paksa (SSE, import, edit)
  const [refreshKey, setRefreshKey] = useState(0);

  // ====== State terpisah untuk Import dan Delete ======
  const [showImport, setShowImport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // ====== Daftar pasar (dipakai dropdown & ImportExcel) ======
  const [markets, setMarkets] = useState<Array<{ id: number; nama_pasar: string }>>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | "all">("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getMarkets(); // {rows:[...]} ATAU array
        const list = Array.isArray((res as any).rows)
          ? (res as any).rows
          : Array.isArray(res)
          ? (res as any)
          : [];
        if (!alive) return;
        setMarkets(list);
      } catch (e) {
        console.error("[markets] gagal load:", e);
        setMarkets([]); // fallback aman
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Nama pasar aktif (untuk judul export)
  const selectedMarketName = useMemo(() => {
    if (selectedMarketId === "all") return "Semua Pasar";
    const f = markets.find((m) => m.id === Number(selectedMarketId));
    return f?.nama_pasar || "Semua Pasar";
  }, [selectedMarketId, markets]);

  // ====== Query data laporan (untuk tampilan) ======
  const sortDir: "asc" | "desc" =
    sort === "date_asc" || (sort as any) === "asc" ? "asc" : "desc";

  const { data: reports, loading, error, refetch } = useReports({
    from: allDates ? undefined : startDate || undefined,
    to: allDates ? undefined : endDate || undefined,
    market: selectedMarketId === "all" ? "all" : Number(selectedMarketId),
    sort: sortDir,
    page: 1,
    pageSize: allDates ? 20000 : 500,
    refreshKey, // ⬅️ kalau berubah → re-fetch
  });

  const sorted = useMemo(() => sortReports(reports, sort), [reports, sort]);
  const { seriesByCommodity, marketPie, commodityBars } = useReportStats(sorted);

  const avgPrice =
    sorted.length > 0
      ? Math.round(sorted.reduce((s, r) => s + (r as any).price, 0) / sorted.length)
      : null;
  const maxPrice =
    sorted.length > 0 ? Math.max(...sorted.map((r) => (r as any).price)) : null;
  const minPrice =
    sorted.length > 0 ? Math.min(...sorted.map((r) => (r as any).price)) : null;

  // ====== SSE subscribe: auto-refresh ketika data berubah di server ======
  useEffect(() => {
    const stop = subscribePrices(
      // setiap event → paksa refresh
      () => setRefreshKey((k) => k + 1),
      { marketId: selectedMarketId === "all" ? undefined : Number(selectedMarketId) }
    );
    return stop;
  }, [selectedMarketId]);

  // ====== Export Excel handler (ambil semua halaman) ======
  const [exporting, setExporting] = useState(false);

  async function fetchAllInRange(params: { from: string; to: string; marketId: number }) {
    const PAGE = 500;
    let page = 1;
    let acc: any[] = [];
    for (;;) {
      const res = await fetchReports({
        from: params.from,
        to: params.to,
        market: params.marketId, // api.ts akan kirim sebagai ?marketId=
        sort: "asc",
        page,
        pageSize: PAGE,
      });
      const rows = res.rows || [];
      acc = acc.concat(rows);
      if ((res.total && acc.length >= res.total) || rows.length < PAGE) break;
      page += 1;
    }
    return acc;
  }

  async function handleExportExcel() {
    try {
      if (selectedMarketId === "all") {
        alert("Silakan pilih satu pasar dulu untuk export.");
        return;
      }
      setExporting(true);

      // Tentukan rentang ekspor 1 bulan penuh
      let exportFrom: string | undefined;
      let exportTo: string | undefined;

      if (!allDates && startDate && endDate) {
        exportFrom = startDate;
        exportTo = endDate;
      } else {
        const sample: any = sorted?.[0] ?? (reports as any)?.[0];
        const iso = (sample?.date || sample?.tanggal || "").slice(0, 10);
        if (!iso) {
          alert("Tidak ada data untuk di-export pada filter saat ini.");
          return;
        }
        const b = monthBoundsFromISO(iso);
        exportFrom = b.from;
        exportTo = b.to;
      }

      const allRows = await fetchAllInRange({
        from: exportFrom!,
        to: exportTo!,
        marketId: Number(selectedMarketId),
      });

      const flat = allRows.map((r: any) => ({
        tanggal: r.date || r.tanggal,
        pasar: r.market || r.pasar || r.marketName || r.market_name,
        komoditas: r.commodity || r.komoditas || r.commodityName || r.commodity_name,
        harga: Number(r.price ?? r.harga ?? 0),
      }));

      const { rows, monthLabel } = buildRowsForExport(
        flat,
        selectedMarketName,
        exportFrom,
        exportTo
      );

      await exportMarketExcel({
        title: `Harga Pasar Bahan Pangan Tingkat Produsen di ${selectedMarketName} ${
          monthLabel.split(" ")[1]
        }`,
        monthLabel,
        rows,
        fileName: `${selectedMarketName
          .toLowerCase()
          .replace(/\s+/g, "-")}-${String(exportFrom).slice(0, 7)}.xlsx`,
      });
    } catch (e) {
      console.error("[Export] error:", e);
      alert("Terjadi kesalahan saat export. Cek Console untuk detail.");
    } finally {
      setExporting(false);
    }
  }

  // ====== Import Data handler ======
  const handleImported = () => {
    setShowImport(false);
    // refresh ringan di sisi lokal
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Harga Pangan Banjarbaru Aktual</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Data laporan harga komoditas pasar</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-2 text-sm rounded-lg border ${
                tab === "summary" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 dark:border-gray-600"
              }`}
              onClick={() => setTab("summary")}
            >
              Ringkasan & Grafik
            </button>
            <button
              className={`px-4 py-2 text-sm rounded-lg border ${
                tab === "table" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 dark:border-gray-600"
              }`}
              onClick={() => setTab("table")}
            >
              Tabel
            </button>
          </div>
        </div>
      </header>

      {/* Storage Warning Banner */}
      <div className="px-8 pt-4">
        <StorageWarning />
      </div>

      {/* Filter + Aksi */}
      <section className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
        {/* 3 kolom: [Urut] [Filter] [Aksi] */}
        <div className="grid items-center gap-4 grid-cols-1 md:grid-cols-[auto_1fr_auto]">
          {/* Kolom 1: Urut */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Urut:</span>
            <select
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Urutkan tanggal"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Kolom 2: Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={allDates}
                onChange={(e) => setAllDates(e.target.checked)}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Semua tanggal</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={allDates}
                className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                aria-label="Tanggal mulai"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={allDates}
                className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                aria-label="Tanggal akhir"
              />
            </div>

            <select
              value={selectedMarketId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedMarketId(v === "all" ? "all" : Number(v));
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              aria-label="Pilih pasar"
            >
              <option value="all">Semua Pasar</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama_pasar}
                </option>
              ))}
            </select>
          </div>

          {/* Kolom 3: Aksi */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowImport(!showImport);
                setShowDelete(false); // Tutup Delete section
              }}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              title="Import data Excel ke database"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import Data
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-60"
              title="Export Excel"
            >
              <FileSpreadsheet className="w-4 h-4" /> {exporting ? "Mengekspor..." : "Export Excel"}
            </button>

            <button
              onClick={() => {
                setShowDelete(!showDelete);
                setShowImport(false); // Tutup Import section
                // Scroll to delete zone setelah section muncul
                setTimeout(() => {
                  const deleteSection = document.querySelector('.zona-bahaya-delete');
                  if (deleteSection && !showDelete) {
                    deleteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              title="Hapus data bulanan"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        {/* Panel Import (terpisah) */}
        {showImport && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium mb-3">Import Data Excel</h3>
            <ImportExcel
              markets={markets}
              selectedMarketId={selectedMarketId ?? "all"}
              onDone={handleImported}
            />
          </div>
        )}

        {/* Zona Bahaya (terpisah) */}
        {showDelete && (
          <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50 zona-bahaya-delete">
            <h3 className="font-semibold text-red-700 mb-3">
              Zona Bahaya: Hapus Data Bulanan
            </h3>
            <DangerBulkDelete selectedMarketId={selectedMarketId} onDone={() => setRefreshKey(k => k + 1)} />
          </div>
        )}
      </section>

      {/* Konten */}
      <section className="p-8">
        {tab === "summary" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card title="Total Data" value={String(sorted.length)} />
              <Card title="Rata-rata Harga" value={avgPrice !== null ? formatCurrency(avgPrice) : "—"} />
              <Card title="Harga Tertinggi" value={maxPrice !== null ? formatCurrency(maxPrice) : "—"} />
              <Card title="Harga Terendah" value={minPrice !== null ? formatCurrency(minPrice) : "—"} />
            </div>

            {loading && <div className="p-6 text-sm text-gray-600">Memuat data…</div>}
            {error && <div className="p-6 text-sm text-red-600">{String(error)}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <CommodityLineChart title="Grafik Harga Beras" data={seriesByCommodity("Beras")} />
              <CommodityLineChart
                title="Grafik Harga Cabe Rawit"
                data={seriesByCommodity("Cabe Rawit")}
                stroke="#dc2626"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <MarketPie data={marketPie} />
              <CommodityBarChart data={commodityBars} />
            </div>
          </>
        ) : (
          <>
            {loading && <div className="p-6 text-sm text-gray-600">Memuat data…</div>}
            {error && <div className="p-6 text-sm text-red-600">{String(error)}</div>}
            {!loading && !error && (
              <ReportsTable
                data={sorted}
                onEdited={() => setRefreshKey((k) => k + 1)} // ⬅️ selesai edit → refresh
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

function DangerBulkDelete({
  selectedMarketId,
  onDone,
}: {
  selectedMarketId: number | "all";
  onDone: () => void;
}) {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // 1..12
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [preview, setPreview] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePreview() {
    if (selectedMarketId === "all") {
      alert("Pilih 1 pasar dulu.");
      return;
    }
    try {
      setLoading(true);
      const res = await previewBulkDelete({
        marketId: Number(selectedMarketId),
        year,
        month,
      });
      setPreview(Number(res?.total ?? 0));
    } catch (e) {
      console.error(e);
      alert("Gagal preview. Lihat console.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (selectedMarketId === "all") {
      alert("Pilih 1 pasar dulu.");
      return;
    }
    if (
      !confirm(
        `Hapus semua data bulan ${String(month).padStart(2, "0")}-${year} untuk pasar terpilih? TINDAKAN INI TIDAK BISA DIURUNGKAN.`
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      const res = await bulkDeleteReports({
        marketId: Number(selectedMarketId),
        year,
        month,
      });
      alert(`Berhasil hapus ${res?.deleted ?? 0} baris.`);
      setPreview(null);
      onDone(); // refresh data
    } catch (e) {
      console.error(e);
      alert("Gagal hapus. Lihat console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex flex-col">
        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bulan</label>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {String(i + 1).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tahun</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 border rounded-lg text-sm w-28 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        />
      </div>

      <button
        onClick={handlePreview}
        disabled={loading || selectedMarketId === "all"}
        className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed dark:text-gray-200 dark:border-gray-600"
        title={selectedMarketId === "all" ? "Pilih 1 pasar tertentu dulu" : "Hitung data yang akan dihapus"}
      >
        Preview
      </button>

      <button
        onClick={handleDelete}
        disabled={loading || selectedMarketId === "all" || (preview !== null && preview === 0)}
        className="px-3 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
        title={
          selectedMarketId === "all" 
            ? "Pilih 1 pasar tertentu dulu" 
            : preview === 0 
            ? "Tidak ada data untuk dihapus pada bulan & pasar terpilih" 
            : "Hapus semua data untuk bulan & pasar terpilih"
        }
      >
        Hapus Bulan Ini
      </button>

      {preview !== null && (
        <span className={`text-sm ${preview > 0 ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>
          {preview > 0 ? (
            <>Akan dihapus: <b>{preview}</b> baris</>
          ) : (
            <>Tidak ada data untuk bulan & pasar ini</>
          )}
        </span>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Semua komoditas</p>
    </div>
  );
}
