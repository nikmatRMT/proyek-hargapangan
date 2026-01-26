// Helper untuk ekspor data

// Minggu Romawi per rentang 7 hari
export function weekRomanForDay(day: number): string {
  const idx = Math.floor((day - 1) / 7); // 0..4
  return ["I", "II", "III", "IV", "V"][Math.min(Math.max(idx, 0), 4)];
}

// Label bulan "Juli 2024" (untuk judul export)
export function monthLabelFromISO(dateISO: string): string {
  const [y, m] = dateISO.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

// Fungsi untuk membangun baris data untuk ekspor
export function buildRowsForExport(flat: any[], marketName: string, fromISO?: string, toISO?: string) {
  const filtered = flat.filter((r: any) => {
    const tanggal = r.date || r.tanggal;
    const pasar = r.market || r.pasar || r.marketName || r.market_name;
    if (!tanggal) return false;
    if (marketName !== "Semua Pasar" && pasar !== marketName) return false;
    if (fromISO && tanggal < fromISO) return false;
    if (toISO && tanggal > toISO) return false;
    return true;
  });

  const byDate = new Map<string, any>();
  for (const r of filtered) {
    const tanggal: string = r.date || r.tanggal;
    const day = new Date(tanggal).getDate();
    if (!byDate.has(tanggal)) {
      byDate.set(tanggal, {
        week: weekRomanForDay(day),
        day,
        komoditas: {},
      });
    }
    const row = byDate.get(tanggal)!;
    const namaKomoditas: string = r.commodity || r.komoditas || "";
    const harga = Number(r.price ?? r.harga ?? 0);
    row.komoditas[namaKomoditas] = harga;
  }

  const rows = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v);

  const firstISO: string | undefined =
    filtered[0]?.date || filtered[0]?.tanggal || fromISO || toISO;
  const monthLabel = firstISO
    ? monthLabelFromISO(firstISO)
    : monthLabelFromISO(new Date().toISOString().slice(0, 10));

  return { rows, monthLabel };
}