// src/utils/validate.ts
export type ParseResult = { value: number | null; suspect: boolean; reason?: string };

// Normalisasi angka rupiah dari berbagai format → integer rupiah
export function parseRupiahSafe(v: unknown): ParseResult {
  if (v == null) return { value: null, suspect: true, reason: "empty" };
  let s = String(v).trim();

  // buang spasi, ubah koma ke titik
  s = s.replace(/\s+/g, "").replace(/,/g, ".");
  // jika ada > 1 titik → anggap pemisah ribuan, buang semua titik
  if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");

  let n = Number(s);
  if (!Number.isFinite(n)) return { value: null, suspect: true, reason: "nan" };
  n = Math.round(n); // rupiah integer

  // Heuristik dasar untuk flag
  if (n < 100) return { value: n, suspect: true, reason: "too_small" };
  if (n > 200_000) return { value: n, suspect: true, reason: "too_large" };
  return { value: n, suspect: false };
}

export function isSuspectPrice(v: unknown): boolean {
  return parseRupiahSafe(v).suspect;
}
