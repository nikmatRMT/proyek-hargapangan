// src/utils/date.ts
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Label bulan "Juli 2024" dari "yyyy-mm-dd" */
export function monthLabelFromISO(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Number.isFinite(y) ? y : new Date().getFullYear(), (m || 1) - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/** Ambil batas 1 bulan penuh berdasarkan iso "yyyy-mm-dd" */
export function monthBoundsFromISO(iso: string): { from: string; to: string } {
  const [y, m] = iso.split("-").map(Number);
  const first = new Date(y, (m || 1) - 1, 1);
  const last = new Date(y, (m || 1), 0);
  return { from: toISODate(first), to: toISODate(last) };
}
