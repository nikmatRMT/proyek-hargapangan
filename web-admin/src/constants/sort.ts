// src/constants/sort.ts
export type SortKey =
  | "date_desc"
  | "date_asc"
  | "price_desc"
  | "price_asc"
  | "commodity_asc"
  | "commodity_desc";

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "date_desc", label: "Terbaru dulu" },
  { value: "date_asc", label: "Terlama dulu" },
  { value: "price_desc", label: "Harga tertinggi" },
  { value: "price_asc", label: "Harga terendah" },
  { value: "commodity_asc", label: "Komoditas A→Z" },
  { value: "commodity_desc", label: "Komoditas Z→A" },
];

// helper kecil untuk ambil kolom dengan alias
function getDate(r: any): string {
  // pastikan string ISO yyyy-mm-dd agar bisa dibandingkan
  const d = r?.date ?? r?.tanggal ?? r?.tgl ?? "";
  if (!d) return "";
  // kalau backend sudah kirim yyyy-mm-dd, langsung pakai
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  // fallback: parse Date lalu format ke yyyy-mm-dd (UTC supaya konsisten)
  const dt = new Date(d);
  if (isNaN(+dt)) return "";
  return new Date(
    Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())
  ).toISOString().slice(0, 10);
}
function getPrice(r: any): number {
  const n = Number(r?.price ?? r?.harga ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function getCommodity(r: any): string {
  const s = String(r?.commodity ?? r?.komoditas ?? "").trim().toLowerCase();
  return s;
}

export function sortReports(data: any[] | undefined, key: SortKey) {
  // guard: selalu array
  const rows = Array.isArray(data) ? [...data] : [];

  switch (key) {
    case "date_desc":
      rows.sort((a, b) => getDate(b).localeCompare(getDate(a)));
      break;
    case "date_asc":
      rows.sort((a, b) => getDate(a).localeCompare(getDate(b)));
      break;
    case "price_desc":
      rows.sort((a, b) => getPrice(b) - getPrice(a));
      break;
    case "price_asc":
      rows.sort((a, b) => getPrice(a) - getPrice(b));
      break;
    case "commodity_desc":
      rows.sort((a, b) => getCommodity(b).localeCompare(getCommodity(a)));
      break;
    case "commodity_asc":
      rows.sort((a, b) => getCommodity(a).localeCompare(getCommodity(b)));
      break;
    default:
      // fallback aman (terbaru dulu)
      rows.sort((a, b) => getDate(b).localeCompare(getDate(a)));
  }
  return rows;
}
