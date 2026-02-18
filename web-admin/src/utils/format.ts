// src/utils/format.ts

/** Format ke "Rp 12.345" dengan fallback bila nilai tidak valid. */
export function formatCurrency(
  value: unknown,         // ← terima number/string/null/undefined
  fallback = "—"
): string {
  // Normalisasi ke angka
  let n: number;

  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string") {
    // Ambil digit saja: "58.000", "Rp 58.000", dsb → 58000
    const digits = value.replace(/[^\d.-]/g, "");
    n = Number(digits);
  } else {
    n = NaN;
  }

  if (!Number.isFinite(n)) return fallback;

  const s = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0, // tanpa koma
  }).format(Math.round(n));

  // Hindari NBSP yang kadang bikin wrapping aneh
  return s.replace(/\u00A0/g, " ");
}

/** Opsional: angka biasa "12.345" (tanpa Rp) */
export function formatNumber(value: unknown, fallback = "—"): string {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[^\d.-]/g, ""))
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function formatDate(iso: string) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
