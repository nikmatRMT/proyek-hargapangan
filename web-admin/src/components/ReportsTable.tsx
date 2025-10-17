import React, { useMemo, useState } from "react";
import { ExternalLink, AlertTriangle, Pencil, Check, X } from "lucide-react";
import { isSuspectPrice, parseRupiahSafe } from "@/utils/validate";
import { updateReportPrice } from "@/api";
import { formatCurrency } from "@/utils/format";
import { unitForCommodity } from "@/constants/units";
import { absUrl, cachebust } from "@/lib/url";

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
  const [saving, setSaving] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function submitEdit(row: ReportRow) {
    setErrMsg(null);
    const parsed = parseRupiahSafe(editVal);
    if (parsed.value == null) {
      setErrMsg("Nilai tidak valid.");
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
        <table className="w-full table-fixed border-separate border-spacing-0 min-w-[1200px] text-sm">
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>

          <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur">
            <tr>
              <Th>Tanggal</Th>
              <Th>Pasar</Th>
              <Th>Komoditas</Th>
              <Th>Harga (Rp/Unit)</Th>
              <Th>Keterangan</Th>
              <Th>Foto Bukti</Th>
              <Th>Link GPS</Th>
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
                  <tr key={key} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100/60">
                    <Td>{fmtDate(tanggal)}</Td>
                    <Td>{pasar ?? "—"}</Td>
                    <Td>{komoditas}</Td>

                    {/* Harga: tidak menimpa kolom lain */}
                    <Td nowrap={false} align="left">
                      {!isEditing ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`tabular-nums ${suspicious ? "text-red-600 font-semibold" : "text-gray-900"}`}
                            title={suspicious ? "Nilai mencurigakan, mohon periksa" : ""}
                          >
                            {formatCurrency(currentPrice)}{" "}
                            <span className="text-gray-500">{unitLabel}</span>
                          </span>

                          {suspicious && (
                            <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                              <AlertTriangle className="w-4 h-4" />
                              Periksa
                            </span>
                          )}

                          <button
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 border rounded-md text-xs hover:bg-gray-50 whitespace-nowrap min-w-[88px] justify-center"
                            onClick={() => {
                              setEditId(r.id ?? `${i}-${tanggal}-${komoditas}`);
                              setEditVal(String(currentPrice ?? ""));
                            }}
                            title="Perbaiki harga"
                          >
                            <Pencil className="w-4 h-4 shrink-0" />
                            <span className="leading-none">Perbaiki</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            className="px-2 py-1 border rounded w-24 text-sm"
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            placeholder="cth: 8500"
                          />

                          <button
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium disabled:opacity-50 whitespace-nowrap min-w-[92px] justify-center"
                            onClick={() => submitEdit(r)}
                            disabled={saving}
                            title="Simpan"
                          >
                            <Check className="w-4 h-4 shrink-0" />
                            <span className="leading-none">Simpan</span>
                          </button>

                          <button
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-xs font-medium whitespace-nowrap min-w-[72px] justify-center"
                            onClick={() => {
                              setEditId(null);
                              setErrMsg(null);
                            }}
                            title="Batal"
                          >
                            <X className="w-4 h-4 shrink-0" />
                            <span className="leading-none">Batal</span>
                          </button>

                          {errMsg && <span className="text-xs text-red-600">{errMsg}</span>}
                        </div>
                      )}
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
