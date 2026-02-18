import React, { useMemo, useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ExternalLink, AlertTriangle, Pencil, Check, X } from "lucide-react";
import { isSuspectPrice, parseRupiahSafe } from "@/utils/validate";
import { updateReportPrice, patchPriceById, fetchMarketsOptions, fetchCommoditiesOptions } from "@/api";
import { formatCurrency } from "@/utils/format";
import { unitForCommodity } from "@/constants/units";
import { absUrl, cachebust } from "@/lib/url";
import useColumnLayout from "@/hooks/useColumnLayout";
import ColumnSettings from "@/components/ColumnSettings";

export type ReportRow = {
  id?: string | number;
  date?: string; tanggal?: string;
  market?: string; pasar?: string; market_name?: string;
  commodity?: string; komoditas?: string; commodity_name?: string;
  price?: number; harga?: number;
  unit?: string;
  note?: string | null; notes?: string | null; keterangan?: string | null;
  photo_url?: string | null; foto_url?: string | null;
  gps_url?: string | null; gps_lat?: number | null; gps_lng?: number | null;
  // optional id references (returned by backend)
  market_id?: number;
  commodity_id?: number;
  komoditas_id?: number;
  marketId?: number;
  commodityId?: number;
};

type Props = {
  data?: ReportRow[];
  rows?: ReportRow[];
  pageSize?: number;
  className?: string;
  onEdited?: (row: ReportRow) => void;
};

function pick<T>(...vals: any[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
  return undefined;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  const iso = d.replace(/\//g, "-");
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "numeric", year: "numeric" });
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 leading-[1.4]">
    {children}
  </th>
);

// >>> prop `nowrap` agar sel bisa membungkus konten
const Td = ({
  children,
  align = "left",
  nowrap = true,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  nowrap?: boolean;
}) => (
  <td
    className={[
      "px-4 py-3 text-sm text-gray-900 border-b border-gray-100 leading-[1.4]",
      align === "right" ? "text-right" : "text-left",
      nowrap ? "whitespace-nowrap" : "whitespace-normal",
    ].join(" ")}
  >
    {children ?? "—"}
  </td>
);


// Simple inline dropdown that always renders menu below the button (unless viewport blocks it)
function InlineDropdown({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: any;
  options: Array<{ value: any; label: string }>;
  onChange: (v: any) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onDoc);
    return () => window.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-foreground flex items-center gap-2 min-w-[160px] justify-between shadow-sm hover:border-green-500 transition-colors"
        onClick={() => setOpen((s) => !s)}
      >
        <span className="truncate">{selected ? selected.label : (placeholder ?? '-- Pilih --')}</span>
        <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.25 8.27a.75.75 0 01-.02-1.06z" /></svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-[240px] max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50">
          {options.map((o) => (
            <div
              key={o.value}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${String(o.value) === String(value) ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-foreground'}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default function ReportsTable({
  data,
  rows,
  pageSize = 50,
  className,
  onEdited,
}: Props) {
  const items = useMemo<ReportRow[]>(
    () => (Array.isArray(data) ? data : Array.isArray(rows) ? rows : []),
    [data, rows]
  );

  const [page, setPage] = useState(1);
  const perPage = pageSize;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const pageData = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  const [editId, setEditId] = useState<string | number | null>(null);
  const [editVal, setEditVal] = useState<string>("");
  const [editMarketVal, setEditMarketVal] = useState<string | number | null>(null);
  const [editCommodityVal, setEditCommodityVal] = useState<string | number | null>(null);
  const [editUnitVal, setEditUnitVal] = useState<string>("");
  const [editMarketRowId, setEditMarketRowId] = useState<string | number | null>(null);
  const [editCommodityRowId, setEditCommodityRowId] = useState<string | number | null>(null);
  const [editDateId, setEditDateId] = useState<string | number | null>(null);
  const [editDateVal, setEditDateVal] = useState<Date | null>(null);
  // Edit tanggal
  async function submitEditDate(row: ReportRow) {
    setErrMsg(null);
    if (!editDateVal) {
      setErrMsg("Tanggal tidak valid.");
      return;
    }
    try {
      setSaving(true);
      const idNum = Number(row.id);
      if (!Number.isFinite(idNum)) throw new Error("ID laporan tidak valid.");
      // Gunakan API khusus update tanggal
      const tanggalStr = editDateVal.toISOString().split("T")[0];
      // import updateReportDate secara eksplisit jika belum
      const { updateReportDate } = await import("@/api");
      await updateReportDate(idNum, tanggalStr, "[manual-fix] edit tanggal dari dashboard");
      row.tanggal = tanggalStr;
      row.date = tanggalStr;
      setEditDateId(null);
      onEdited?.(row);
    } catch (e: any) {
      setErrMsg(e?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }
  const [saving, setSaving] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<number | null>(null);
  const [marketsOptions, setMarketsOptions] = useState<Array<{ value: any; label: string }>>([]);
  const [commoditiesOptions, setCommoditiesOptions] = useState<Array<{ value: any; label: string }>>([]);

  // column layout settings
  const tableId = "reports-table-v1";
  const columns = [
    { key: "tanggal", label: "Tanggal" },
    { key: "pasar", label: "Pasar" },
    { key: "komoditas", label: "Komoditas" },
    { key: "harga", label: "Harga (Rp/Unit)" },
    { key: "keterangan", label: "Keterangan" },
    { key: "foto", label: "Foto Bukti" },
    { key: "gps", label: "Link GPS" },
  ];
  const defaults = { tanggal: 14, pasar: 32, komoditas: 24, harga: 18, keterangan: 6, foto: 3, gps: 3 };
  const { layout, setLayout, reset } = useColumnLayout(tableId, defaults);
  const [showSettings, setShowSettings] = useState(false);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [dragging, setDragging] = useState<null | { key: string; startX: number; startWidth: number }>(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const tableEl = tableRef.current;
      if (!tableEl) return;
      const rect = tableEl.getBoundingClientRect();
      const deltaPx = e.clientX - dragging.startX;
      const deltaPct = (deltaPx / rect.width) * 100;
      const newW = Math.max(4, Math.min(90, dragging.startWidth + deltaPct));
      setLayout((prev) => ({ ...prev, [dragging.key]: Number(newW.toFixed(2)) }));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, setLayout]);

  // Load markets & commodities for dropdowns. Re-run when `data`/`rows` change so options reflect deletions/edits.
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const m = await fetchMarketsOptions();
        if (!mounted) return;
        setMarketsOptions(m);
      } catch (err) {
        // ignore
      }
    })();

    (async () => {
      try {
        const k = await fetchCommoditiesOptions();
        if (!mounted) return;
        setCommoditiesOptions(k);
      } catch (err) {
        // ignore
      }
    })();

    return () => { mounted = false; };
    // re-run when rows/data change
  }, [data, rows]);

  async function submitEdit(row: ReportRow) {
    setErrMsg(null);
    const parsed = parseRupiahSafe(editVal);
    if (parsed.value == null) {
      setErrMsg("Nilai tidak valid.");
      return;
    }
    // block extremely large values > 7 digits
    if (Math.abs(Math.trunc(parsed.value)) > 9999999) {
      setErrMsg('Harga terlalu besar (lebih dari 7 digit)');
      return;
    }
    try {
      setSaving(true);
      const idNum = Number(row.id);
      if (!Number.isFinite(idNum)) throw new Error("ID laporan tidak valid.");
      await updateReportPrice({
        id: idNum,
        price: parsed.value,
        notes: "[manual-fix] perbaikan dari dashboard",
      });
      row.price = parsed.value;
      row.harga = parsed.value;
      setEditId(null);
      onEdited?.(row);
    } catch (e: any) {
      setErrMsg(e?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={className}>
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <div className="flex items-center justify-end p-2">
          <div className="relative">
            <button className="px-2 py-1 border rounded text-sm" onClick={() => setShowSettings((s) => !s)}>
              ⚙️ Atur kolom
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2">
                <ColumnSettings
                  defaults={defaults}
                  layout={layout}
                  onChange={(next) => setLayout(next)}
                  onClose={() => setShowSettings(false)}
                  onReset={() => { reset(); setShowSettings(false); }}
                />
              </div>
            )}
          </div>
        </div>

        <table ref={tableRef} className="w-full table-fixed border-separate border-spacing-0 min-w-[1200px] text-sm">
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={{ width: `${layout[c.key] ?? defaults[c.key]}%` }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-sm">
            <tr>
              {columns.map((c, idx) => (
                <Th key={c.key}>
                  <div className={`relative flex items-center group ${dragging?.key === c.key ? 'bg-gray-50 dark:bg-gray-800' : ''}`}>
                    <span className="flex-1">{c.label}</span>
                    {idx < columns.length - 1 && (
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startW = Number(layout[c.key] ?? defaults[c.key]);
                          setDragging({ key: c.key, startX: e.clientX, startWidth: startW });
                        }}
                        className={`absolute right-0 top-0 h-full -mr-2 cursor-col-resize touch-none flex items-center justify-center opacity-100`}
                        style={{ width: 28, paddingRight: 6 }}
                        aria-hidden
                      >
                        <div className={`w-[3px] h-3/4 rounded bg-gray-300 ${dragging?.key === c.key ? 'bg-blue-500' : ''}`} />
                      </div>
                    )}
                  </div>
                </Th>
              ))}
              {/* Aksi column removed - edits now per-cell */}
            </tr>
          </thead>

          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                  Tidak ada data untuk ditampilkan.
                </td>
              </tr>
            ) : (
              pageData.map((r, i) => {
                const tanggal = pick<string>(r.tanggal, r.date);
                const pasar = pick<string>(r.pasar, r.market, r.market_name);
                const komoditas = pick<string>(r.komoditas, r.commodity, r.commodity_name) ?? "—";
                const unitLabel = unitForCommodity(komoditas);
                const note = pick<string>(r.keterangan, r.note, r.notes) ?? "—";

                // Foto → jadikan ABSOLUTE + cache-bust
                const photoRel = pick<string>(r.foto_url, r.photo_url);
                const photoUrl = photoRel ? cachebust(absUrl(photoRel)) : "";

                // GPS
                const gpsUrl =
                  r.gps_url ??
                  (r.gps_lat != null && r.gps_lng != null
                    ? `https://www.google.com/maps?q=${r.gps_lat},${r.gps_lng}`
                    : undefined);

                const currentPrice = r.price ?? r.harga ?? null;
                const suspicious = isSuspectPrice(currentPrice);
                const key = String(r.id ?? `${i}-${tanggal}-${komoditas}`);
                const isEditing = editId === (r.id ?? `${i}-${tanggal}-${komoditas}`);

                return (
                  <tr key={key} data-row-id={r.id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                    <Td>
                      <div className="flex items-center min-w-[210px] gap-2">
                        {editDateId === r.id ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 6,
                              minWidth: 0,
                              padding: 0,
                              background: '#fff',
                              borderRadius: 6,
                              border: '1px solid #e5e7eb',
                              position: 'static',
                              zIndex: 1,
                            }}
                          >
                            <DatePicker
                              selected={editDateVal}
                              onChange={(date: Date | null) => setEditDateVal(date)}
                              dateFormat="dd/MM/yyyy"
                              customInput={<input style={{ width: 120, fontSize: 15, padding: '6px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', outline: 'none', transition: 'border 0.2s' }} />}
                              popperPlacement="bottom-start"
                              showPopperArrow={false}
                              wrapperClassName="date-picker-wrapper"
                            />
                            <div className="flex flex-row gap-1 w-full mt-1 justify-center items-center">
                              <button
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                                style={{ minWidth: 0, lineHeight: 1.1 }}
                                onClick={() => submitEditDate(r)}
                                type="button"
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M9.293 16.293a1 1 0 0 0 1.414 0l7-7a1 1 0 1 0-1.414-1.414L10 13.586l-2.293-2.293a1 1 0 1 0-1.414 1.414l3 3Z" /></svg>
                                Simpan
                              </button>
                              <button
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                                style={{ minWidth: 0, lineHeight: 1.1 }}
                                onClick={() => setEditDateId(null)}
                                type="button"
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M6.225 6.225a1 1 0 0 1 1.414 0L12 10.586l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 12l4.361 4.361a1 1 0 1 1-1.414 1.414L12 13.414l-4.361 4.361a1 1 0 1 1-1.414-1.414L10.586 12 6.225 7.639a1 1 0 0 1 0-1.414Z" /></svg>
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="flex items-center gap-2">
                            {fmtDate(tanggal)}
                            <button
                              className="ml-2 inline-flex items-center justify-center p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                              onClick={() => {
                                // open date editor only, close other editors
                                setEditId(null);
                                setEditMarketRowId(null);
                                setEditCommodityRowId(null);
                                setEditDateId(r.id!);
                                setEditDateVal(tanggal ? new Date(tanggal) : new Date());
                              }}
                              title="Edit tanggal"
                              aria-label="Edit tanggal"
                            >
                              <Pencil size={15} />
                            </button>
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ paddingLeft: editDateId === r.id ? 56 : 0, transition: 'padding 0.2s' }}>
                        {editMarketRowId === r.id ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 6,
                              minWidth: 0,
                              padding: 0,
                              background: '#fff',
                              borderRadius: 6,
                              border: '1px solid #e5e7eb',
                              position: 'static',
                              zIndex: 1,
                            }}
                          >
                            <InlineDropdown
                              value={editMarketVal ?? ""}
                              options={[{ value: '', label: '-- Pilih Pasar --' }, ...marketsOptions]}
                              onChange={(v) => setEditMarketVal(v)}
                            />

                            <div className="flex flex-row gap-1 w-full mt-1 justify-center items-center">
                              <button
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                                style={{ minWidth: 0, lineHeight: 1.1 }}
                                onClick={async () => {
                                  setSaving(true);
                                  setErrMsg(null);
                                  setConflictId(null);
                                  try {
                                    const mid = editMarketVal ? Number(editMarketVal) : undefined;
                                    await patchPriceById(Number(r.id), { market_id: mid });
                                    r.market_id = mid ?? r.market_id;
                                    const sel = marketsOptions.find(m => String(m.value) === String(mid));
                                    if (sel) r.market = sel.label;
                                    setEditMarketRowId(null);
                                    onEdited?.(r);
                                  } catch (e: any) {
                                    // enhanced error object from api.ts includes status and data
                                    if (e?.status === 409 && e?.data) {
                                      setErrMsg(e.data?.message || 'Ada konflik data');
                                      setConflictId(Number(e.data?.conflictId) || null);
                                    } else {
                                      setErrMsg(e?.message || 'Gagal menyimpan');
                                    }
                                  } finally { setSaving(false); }
                                }}
                                type="button"
                                disabled={saving}
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M9.293 16.293a1 1 0 0 0 1.414 0l7-7a1 1 0 1 0-1.414-1.414L10 13.586l-2.293-2.293a1 1 0 1 0-1.414 1.414l3 3Z" /></svg>
                                Simpan
                              </button>
                              <button
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                                style={{ minWidth: 0, lineHeight: 1.1 }}
                                onClick={() => setEditMarketRowId(null)}
                                type="button"
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M6.225 6.225a1 1 0 0 1 1.414 0L12 10.586l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 12l4.361 4.361a1 1 0 1 1-1.414 1.414L12 13.414l-4.361 4.361a1 1 0 1 1-1.414-1.414L10.586 12 6.225 7.639a1 1 0 0 1 0-1.414Z" /></svg>
                                Batal
                              </button>
                            </div>
                            {errMsg && editMarketRowId === r.id && (
                              <div className="mt-1 text-xs text-red-600 flex items-center gap-2">
                                <span>{errMsg}</span>
                                {conflictId && (
                                  <button
                                    type="button"
                                    className="text-xs underline text-blue-600 hover:text-blue-800"
                                    onClick={() => {
                                      const el = document.querySelector(`[data-row-id=\"${conflictId}\"]`) as HTMLElement | null;
                                      if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        el.classList.add('ring-2', 'ring-red-300');
                                        setTimeout(() => el.classList.remove('ring-2', 'ring-red-300'), 2500);
                                      }
                                    }}
                                  >
                                    Buka yang sudah ada
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{pasar ?? "—"}</span>
                            <button className="inline-flex items-center justify-center p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-50" title="Edit pasar" onClick={() => {
                              // open market editor for this row; close other editors
                              setEditId(null);
                              setEditDateId(null);
                              setEditCommodityRowId(null);
                              setEditMarketRowId(r.id ?? key);
                              setEditMarketVal(r.market_id ?? r.marketId ?? "");
                              setErrMsg(null);
                            }} aria-label="Edit pasar">
                              <Pencil size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ paddingLeft: editDateId === r.id ? 56 : 0, transition: 'padding 0.2s' }}>
                        {editCommodityRowId === r.id ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 6,
                              minWidth: 0,
                              padding: 0,
                              background: '#fff',
                              borderRadius: 6,
                              border: '1px solid #e5e7eb',
                              position: 'static',
                              zIndex: 1,
                            }}
                          >
                            <InlineDropdown
                              value={editCommodityVal ?? ""}
                              options={[{ value: '', label: '-- Pilih Komoditas --' }, ...commoditiesOptions]}
                              onChange={(v) => setEditCommodityVal(v)}
                            />

                            <div className="flex flex-row gap-1 w-full mt-1 justify-center items-center">
                              <button
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                                style={{ minWidth: 0, lineHeight: 1.1 }}
                                onClick={async () => {
                                  setSaving(true);
                                  setErrMsg(null);
                                  setConflictId(null);
                                  try {
                                    const kid = editCommodityVal ? Number(editCommodityVal) : undefined;
                                    await patchPriceById(Number(r.id), { komoditas_id: kid });
                                    r.komoditas_id = kid ?? r.komoditas_id;
                                    const sel = commoditiesOptions.find(k => String(k.value) === String(kid));
                                    if (sel) r.komoditas = sel.label;
                                    setEditCommodityRowId(null);
                                    onEdited?.(r);
                                  } catch (e: any) {
                                    if (e?.status === 409 && e?.data) {
                                      setErrMsg(e.data?.message || 'Ada konflik data');
                                      setConflictId(Number(e.data?.conflictId) || null);
                                    } else {
                                      setErrMsg(e?.message || 'Gagal menyimpan');
                                    }
                                  } finally { setSaving(false); }
                                }}
                                type="button"
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M9.293 16.293a1 1 0 0 0 1.414 0l7-7a1 1 0 1 0-1.414-1.414L10 13.586l-2.293-2.293a1 1 0 1 0-1.414 1.414l3 3Z" /></svg>
                                Simpan
                              </button>
                              <button
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                                style={{ minWidth: 0, lineHeight: 1.1 }}
                                onClick={() => setEditCommodityRowId(null)}
                                type="button"
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M6.225 6.225a1 1 0 0 1 1.414 0L12 10.586l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 12l4.361 4.361a1 1 0 1 1-1.414 1.414L12 13.414l-4.361 4.361a1 1 0 1 1-1.414-1.414L10.586 12 6.225 7.639a1 1 0 0 1 0-1.414Z" /></svg>
                                Batal
                              </button>
                            </div>
                            {errMsg && editCommodityRowId === r.id && (
                              <div className="mt-1 text-xs text-red-600 flex items-center gap-2">
                                <span>{errMsg}</span>
                                {conflictId && (
                                  <button
                                    type="button"
                                    className="text-xs underline text-blue-600 hover:text-blue-800"
                                    onClick={() => {
                                      const el = document.querySelector(`[data-row-id=\"${conflictId}\"]`) as HTMLElement | null;
                                      if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        el.classList.add('ring-2', 'ring-red-300');
                                        setTimeout(() => el.classList.remove('ring-2', 'ring-red-300'), 2500);
                                      }
                                    }}
                                  >
                                    Buka yang sudah ada
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{komoditas}</span>
                            <button className="inline-flex items-center justify-center p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-50" title="Edit komoditas" onClick={() => {
                              // open commodity editor for this row; close other editors
                              setEditId(null);
                              setEditDateId(null);
                              setEditMarketRowId(null);
                              setEditCommodityRowId(r.id ?? key);
                              setEditCommodityVal(r.commodity_id ?? r.komoditas_id ?? "");
                              setErrMsg(null);
                            }} aria-label="Edit komoditas">
                              <Pencil size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </Td>
                    {/* Harga: tidak menimpa kolom lain */}
                    <Td nowrap={false} align="left">
                      <div style={{ paddingLeft: editDateId === r.id ? 56 : 0, transition: 'padding 0.2s' }}>
                        {!isEditing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`tabular-nums ${suspicious ? "text-red-600 font-semibold" : "text-gray-900"}`}
                              title={suspicious ? "Nilai mencurigakan, mohon periksa" : ""}
                            >
                              {formatCurrency(currentPrice)} <span className="text-gray-500">{unitLabel}</span>
                            </span>

                            {suspicious && (
                              <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                                <AlertTriangle className="w-4 h-4" /> Periksa
                              </span>
                            )}

                            {typeof currentPrice === 'number' && Math.abs(Math.trunc(currentPrice)) > 9999999 && (
                              <span className="inline-flex items-center gap-1 text-yellow-700 text-xs ml-2">
                                <AlertTriangle className="w-4 h-4" /> Harga &gt; 7 digit
                              </span>
                            )}

                            {/* edit trigger — pencil on Harga cell */}
                            <button
                              className="ml-2 inline-flex items-center justify-center p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                              title="Edit harga"
                              aria-label="Edit harga"
                              onClick={() => {
                                // open price-only editor; close other editors
                                setEditMarketRowId(null);
                                setEditCommodityRowId(null);
                                setEditDateId(null);
                                setEditId(r.id ?? `${i}-${tanggal}-${komoditas}`);
                                setEditVal(String(currentPrice ?? ""));
                                setEditMarketVal(r.market_id ?? r.marketId ?? null);
                                setEditCommodityVal(r.commodity_id ?? r.komoditas_id ?? null);
                                setEditUnitVal(r.unit || unitLabel || "");
                                setErrMsg(null);
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                className="px-2 py-1 border rounded w-24 text-sm"
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                placeholder="cth: 8500"
                              />
                              <span className="text-gray-500">{unitLabel}</span>
                            </div>

                            <div className="flex flex-row gap-1 w-full mt-1 justify-center items-center">
                              <button
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
                                style={{ minWidth: 0, lineHeight: 1.1 }}
                                onClick={async () => {
                                  setSaving(true);
                                  setConflictId(null);
                                  try {
                                    const parsed = parseRupiahSafe(editVal);
                                    if (parsed.value == null) throw new Error('Harga tidak valid');
                                    if (Math.abs(Math.trunc(parsed.value)) > 9999999) {
                                      setErrMsg('Harga terlalu besar (lebih dari 7 digit)');
                                      setSaving(false);
                                      return;
                                    }
                                    await patchPriceById(Number(r.id), { price: parsed.value });
                                    // reflect locally
                                    r.price = parsed.value;
                                    r.harga = parsed.value;
                                    setEditId(null);
                                    setErrMsg(null);
                                    onEdited?.(r);
                                  } catch (e: any) {
                                    if (e?.status === 409 && e?.data) {
                                      setErrMsg(e.data?.message || 'Ada konflik data');
                                      setConflictId(Number(e.data?.conflictId) || null);
                                    } else {
                                      setErrMsg(e?.message || 'Gagal menyimpan');
                                    }
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                                disabled={saving || ((): boolean => { const p = parseRupiahSafe(editVal); return p.value == null || Math.abs(Math.trunc(p.value)) > 9999999; })()}
                                type="button"
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M9.293 16.293a1 1 0 0 0 1.414 0l7-7a1 1 0 1 0-1.414-1.414L10 13.586l-2.293-2.293a1 1 0 1 0-1.414 1.414l3 3Z" /></svg>
                                Simpan
                              </button>

                              <button
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                                style={{ minWidth: 0, lineHeight: 1.1 }}
                                onClick={() => { setEditId(null); setErrMsg(null); }}
                                type="button"
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M6.225 6.225a1 1 0 0 1 1.414 0L12 10.586l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 12l4.361 4.361a1 1 0 1 1-1.414 1.414L12 13.414l-4.361 4.361a1 1 0 1 1-1.414-1.414L10.586 12 6.225 7.639a1 1 0 0 1 0-1.414Z" /></svg>
                                Batal
                              </button>

                              {/* price length warning while editing */}
                              {(() => {
                                const parsed = parseRupiahSafe(editVal);
                                if (parsed.value != null && Math.abs(Math.trunc(parsed.value)) > 9999999) {
                                  return (
                                    <span className="text-xs text-yellow-700 flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      Harga lebih dari 7 digit
                                    </span>
                                  );
                                }
                                if (errMsg) {
                                  return (
                                    <span className="text-xs text-red-600 flex items-center gap-2">
                                      <span>{errMsg}</span>
                                      {conflictId && (
                                        <button
                                          type="button"
                                          className="text-xs underline text-blue-600 hover:text-blue-800"
                                          onClick={() => {
                                            const el = document.querySelector(`[data-row-id=\"${conflictId}\"]`) as HTMLElement | null;
                                            if (el) {
                                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              el.classList.add('ring-2', 'ring-red-300');
                                              setTimeout(() => el.classList.remove('ring-2', 'ring-red-300'), 2500);
                                            }
                                          }}
                                        >
                                          Buka yang sudah ada
                                        </button>
                                      )}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </Td>

                    <Td>{note}</Td>

                    <Td>
                      {photoUrl ? (
                        <a
                          href={photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          title="Buka foto bukti"
                        >
                          Lihat <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </Td>

                    <Td>
                      {gpsUrl ? (
                        <a
                          href={gpsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          title="Buka peta"
                        >
                          Buka Peta <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </Td>

                    {/* Aksi column removed - per-cell edit controls are used */}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-gray-600">
          Halaman {page} / {totalPages} • Total {items.length} baris
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(1)} aria-label="First">⏮</button>
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Prev">‹ Prev</button>
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next">Next ›</button>
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(totalPages)} aria-label="Last">⏭</button>
        </div>
      </div>
    </div>
  );
}
