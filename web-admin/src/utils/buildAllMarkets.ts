// src/utils/buildAllMarkets.ts
import type { MarketRow } from "@/utils/exportExcel";

/* ---------- Normalizer ---------- */
function normalizeText(s?: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")     // collapse spaces
    .replace(/\s*\/\s*/g, "/")// tidy slashes
    .trim();
}

/* ---------- Loose map (normalisasi → key MarketRow) ---------- */
const MAP_LOOSE: Record<string, keyof MarketRow> = {
  "beras": "beras",
  "minyak goreng kemasan": "minyakGorengKemasan",
  "minyak goreng curah": "minyakGorengCurah",
  "tepung terigu kemasan": "tepungTeriguKemasan",
  "tepung terigu curah": "tepungTeriguCurah",
  "gula pasir": "gulaPasir",
  "telur ayam": "telurAyam",
  "daging sapi": "dagingSapi",
  "daging ayam": "dagingAyam",
  "kedelai": "kedelai",
  "bawang merah": "bawangMerah",
  "bawang putih": "bawangPutih",
  "cabe merah besar": "cabeMerahBesar",
  "cabe rawit": "cabeRawit",
  "ikan haruan/gabus": "ikanHaruan",      // ← tanpa spasi sebelum/ sesudah '/'
  "ikan tongkol/tuna": "ikanTongkol",
  "ikan mas/nila": "ikanMas",
  "ikan patin": "ikanPatin",
  "ikan papuyu/betok": "ikanPapuyu",
  "ikan bandeng": "ikanBandeng",
  "ikan kembung/pindang": "ikanKembung",
};

function weekRomanForDay(day: number) {
  const idx = Math.floor((day - 1) / 7);
  return ["I", "II", "III", "IV", "V"][Math.min(Math.max(idx, 0), 4)];
}
function monthLabelFromISO(dateISO: string) {
  const d = new Date(dateISO);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/**
 * Agregasi semua pasar per-bulan → rata-rata per tanggal & komoditas.
 * - Normalisasi label komoditas (longgar).
 * - Selalu buat slot per tanggal agar bulan tidak hilang meski sebagian label gagal dipetakan.
 */
export function buildRowsForExportAllMarkets(
  flatMonth: Array<{ tanggal: string; komoditas: string; harga: number }>,
  desc = true
): { rows: MarketRow[]; monthLabel: string } {
  try {
    const data = Array.isArray(flatMonth) ? flatMonth.filter(Boolean) : [];
    if (data.length === 0) return { rows: [], monthLabel: "" };

    const sampleISO = data.find(d => !!d.tanggal)?.tanggal || data[0].tanggal;
    const monthLabel = sampleISO ? monthLabelFromISO(sampleISO) : "";

    type Slot = {
      day: number;
      sums: Partial<Record<keyof MarketRow, number>>;
      counts: Partial<Record<keyof MarketRow, number>>;
    };
    const byDate = new Map<string, Slot>();

    for (const r of data) {
      const iso = r.tanggal;
      if (!iso) continue;

      // **Selalu** buat slot tanggal dulu
      if (!byDate.has(iso)) {
        byDate.set(iso, { day: new Date(iso).getDate(), sums: {}, counts: {} });
      }
      const slot = byDate.get(iso)!;

      // Pemetaan longgar komoditas
      const label = normalizeText(r.komoditas);
      const key = MAP_LOOSE[label];
      if (!key) continue; // komoditas tidak dikenali → biarkan nol

      const val = Number(r.harga ?? 0);
      slot.sums[key] = (slot.sums[key] ?? 0) + val;
      slot.counts[key] = (slot.counts[key] ?? 0) + 1;
    }

    // Jika tidak ada tanggal sama sekali (seharusnya jarang), kembalikan kosong
    if (byDate.size === 0) return { rows: [], monthLabel };

    const entries = Array.from(byDate.entries());
    entries.sort((a, b) => (desc ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])));

    const rows: MarketRow[] = entries.map(([iso, info], idx, arr) => {
      const day = info.day;
      const curW = Math.floor((day - 1) / 7);
      const prev = arr[idx - 1];
      const prevW = prev ? Math.floor(((prev[1].day as number) - 1) / 7) : -1;
      const showWeek = prevW !== curW;

      const row: MarketRow = {
        week: showWeek ? weekRomanForDay(day) : "",
        day,
        beras: 0, minyakGorengKemasan: 0, minyakGorengCurah: 0,
        tepungTeriguKemasan: 0, tepungTeriguCurah: 0, gulaPasir: 0, telurAyam: 0,
        dagingSapi: 0, dagingAyam: 0, kedelai: 0, bawangMerah: 0, bawangPutih: 0,
        cabeMerahBesar: 0, cabeRawit: 0, ikanHaruan: 0, ikanTongkol: 0,
        ikanMas: 0, ikanPatin: 0, ikanPapuyu: 0, ikanBandeng: 0, ikanKembung: 0,
      };

      (Object.values(MAP_LOOSE) as Array<keyof MarketRow>).forEach((k) => {
        const sum = info.sums[k] ?? 0;
        const cnt = info.counts[k] ?? 0;
        (row[k] as number) = cnt ? Math.round(sum / cnt) : 0;
      });

      return row;
    });

    return { rows, monthLabel };
  } catch (err) {
    console.error("[buildRowsForExportAllMarkets] error:", err);
    return { rows: [], monthLabel: "" };
  }
}
