// web-admin/src/hooks/useReportStats.ts
// Util statistik & seri untuk dashboard (defensive & kompatibel)
// Menghasilkan: seriesByCommodity(), marketPie[], commodityBars[]

import { useCallback, useMemo } from "react";

// Kalau project Anda belum mendefinisikan tipe ReportRow dari hook lain,
// pakai tipe lokal aman ini (date, market, commodity, price dipakai di UI).
export type ReportRow = {
  id?: number | string;
  date?: string;          // "YYYY-MM-DD"
  market?: string;        // nama pasar
  commodity?: string;     // nama komoditas
  price?: number;         // angka (Rp)
  [k: string]: any;
};

const lower = (s?: string | null) => String(s ?? "").toLowerCase();

/** ===== Line chart per komoditas =====
 * return: [{ date, avg }]
 */
function buildSeriesByCommodity(
  data: ReportRow[],
  commodityName?: string
): Array<{ date: string; avg: number }> {
  const key = lower(commodityName);
  const filtered = key ? data.filter(d => lower(d.commodity) === key) : data;

  const map = new Map<string, { sum: number; n: number }>();
  for (const r of filtered) {
    const date = typeof r.date === "string" && r.date ? r.date : null;
    const price = typeof r.price === "number" && isFinite(r.price) ? r.price : null;
    if (!date || price == null) continue;

    const g = map.get(date) || { sum: 0, n: 0 };
    g.sum += price; g.n += 1;
    map.set(date, g);
  }

  const out = Array.from(map, ([date, g]) => ({ date, avg: g.n ? g.sum / g.n : 0 }));
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** ===== Distribusi per pasar (pie) =====
 * return: [{ name, value, count }]
 * (punya "name/value" agar aman untuk komponen chart yang pakai recharts)
 */
function buildMarketPie(data: ReportRow[]) {
  const map = new Map<string, number>();
  for (const r of data) {
    const name = (r.market && String(r.market).trim()) || "Tidak diketahui";
    map.set(name, (map.get(name) || 0) + 1);
  }
  return Array.from(map, ([name, count]) => ({ name, value: count, count }))
    .sort((a, b) => b.value - a.value);
}

/** ===== Rata-rata komoditas (bar) =====
 * return: [{ name, avg, value }]
 */
function buildCommodityBars(data: ReportRow[], limit = 10) {
  const map = new Map<string, { sum: number; n: number }>();
  for (const r of data) {
    const name = (r.commodity && String(r.commodity).trim()) || "Tidak diketahui";
    const price = typeof r.price === "number" && isFinite(r.price) ? r.price : null;
    if (price == null) continue;

    const g = map.get(name) || { sum: 0, n: 0 };
    g.sum += price; g.n += 1;
    map.set(name, g);
  }

  const out = Array.from(map, ([name, g]) => {
    const avg = g.n ? g.sum / g.n : 0;
    return { name, avg, value: avg };
  });
  out.sort((a, b) => b.avg - a.avg);
  return out.slice(0, limit);
}

/** ===== HOOK utama untuk Dashboard =====
 * Mengembalikan nama properti yang memang dipakai Dashboard:
 * - seriesByCommodity(name)
 * - marketPie
 * - commodityBars
 * (bonus "summary" kalau nanti mau dipakai)
 */
export function useReportStats(data: ReportRow[]) {
  const marketPie = useMemo(() => buildMarketPie(data), [data]);
  const commodityBars = useMemo(() => buildCommodityBars(data, 10), [data]);

  const seriesByCommodity = useCallback(
    (name?: string) => buildSeriesByCommodity(data, name),
    [data]
  );

  // ringkasan opsional
  const summary = useMemo(() => {
    let total = 0, sum = 0, n = 0;
    let min: ReportRow | undefined, max: ReportRow | undefined;
    for (const r of data) {
      total++;
      const p = typeof r.price === "number" && isFinite(r.price) ? r.price : null;
      if (p == null) continue;
      sum += p; n++;
      if (!min || p < (min.price ?? Infinity)) min = r;
      if (!max || p > (max.price ?? -Infinity)) max = r;
    }
    return { total, avg: n ? sum / n : 0, min, max };
  }, [data]);

  return { seriesByCommodity, marketPie, commodityBars, summary };
}
