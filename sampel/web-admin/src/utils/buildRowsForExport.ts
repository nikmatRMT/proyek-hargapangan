// src/utils/buildRowsForExport.ts

/**
 * Bentuk baris untuk sheet export.
 * Kosongkan sel (""), JANGAN pakai 0 untuk data yang tidak ada → agar AVERAGE Excel akurat.
 * Duplikat (tanggal, komoditas) bisa diproses dengan mode: "last" | "avg".
 */

export type MarketRow = {
  week: string;
  day: number;

  beras: number | "";
  minyakGorengKemasan: number | "";
  minyakGorengCurah: number | "";
  tepungTeriguKemasan: number | "";
  tepungTeriguCurah: number | "";
  gulaPasir: number | "";
  telurAyam: number | "";
  dagingSapi: number | "";
  dagingAyam: number | "";
  kedelai: number | "";
  bawangMerah: number | "";
  bawangPutih: number | "";
  cabeMerahBesar: number | "";
  cabeRawit: number | "";
  ikanHaruan: number | "";
  ikanTongkol: number | "";
  ikanMas: number | "";
  ikanPatin: number | "";
  ikanPapuyu: number | "";
  ikanBandeng: number | "";
  ikanKembung: number | "";
};

export type BuildRowsOpts = {
  /** Cara menangani duplikasi (tanggal, komoditas): ambil "last" atau "avg". Default: "last". */
  mode?: "last" | "avg";
};

/** Pemetaan nama tampilan → key kolom */
const MAP: Record<string, keyof MarketRow> = {
  "Beras": "beras",
  "Minyak Goreng Kemasan": "minyakGorengKemasan",
  "Minyak Goreng Curah": "minyakGorengCurah",
  "Tepung Terigu Kemasan": "tepungTeriguKemasan",
  "Tepung Terigu Curah": "tepungTeriguCurah",
  "Gula Pasir": "gulaPasir",
  "Telur Ayam": "telurAyam",
  "Daging Sapi": "dagingSapi",
  "Daging Ayam": "dagingAyam",
  "Kedelai": "kedelai",
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

// ---- helpers tanggal lokal (tidak diexport agar tak bentrok di file lain) ----
function weekRomanForDay(day: number) {
  const idx = Math.floor((day - 1) / 7); // 0..4
  return ["I", "II", "III", "IV", "V"][Math.min(Math.max(idx, 0), 4)];
}

function monthLabelFromISO(dateISO: string) {
  const [y, m] = dateISO.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

// ---- builder ----
function blankRow(day: number): MarketRow {
  return {
    week: weekRomanForDay(day),
    day,
    beras: "",
    minyakGorengKemasan: "",
    minyakGorengCurah: "",
    tepungTeriguKemasan: "",
    tepungTeriguCurah: "",
    gulaPasir: "",
    telurAyam: "",
    dagingSapi: "",
    dagingAyam: "",
    kedelai: "",
    bawangMerah: "",
    bawangPutih: "",
    cabeMerahBesar: "",
    cabeRawit: "",
    ikanHaruan: "",
    ikanTongkol: "",
    ikanMas: "",
    ikanPatin: "",
    ikanPapuyu: "",
    ikanBandeng: "",
    ikanKembung: "",
  };
}

/**
 * @param flat array data flat {tanggal|date, pasar|market_name, komoditas|commodity_name, harga|price}
 * @param marketName nama pasar aktif ("Semua Pasar" untuk all)
 * @param fromISO yyyy-mm-dd (opsional)
 * @param toISO yyyy-mm-dd (opsional)
 * @param opts { mode: "last" | "avg" }
 */
export function buildRowsForExport(
  flat: any[],
  marketName: string,
  fromISO?: string,
  toISO?: string,
  opts: BuildRowsOpts = {}
) {
  const mode: "last" | "avg" = opts.mode ?? "last";

  // Filter sesuai pasar & rentang tanggal
  const filtered = (flat || []).filter((r: any) => {
    const tanggal = r.date || r.tanggal;
    const pasar = r.market || r.pasar || r.marketName || r.market_name;
    if (!tanggal) return false;
    if (marketName !== "Semua Pasar" && pasar !== marketName) return false;
    if (fromISO && tanggal < fromISO) return false;
    if (toISO && tanggal > toISO) return false;
    return true;
  });

  // Kelompokkan per tanggal & siapkan row kosong
  const byDate = new Map<string, MarketRow>();
  // Agregasi (duplikat per tanggal-komoditas)
  const agg = new Map<string, { sum: number; count: number; last: number }>();

  for (const r of filtered) {
    const tanggal: string = r.date || r.tanggal;
    const day = new Date(tanggal).getDate();

    if (!byDate.has(tanggal)) {
      byDate.set(tanggal, blankRow(day));
    }

    const namaKomoditas: string =
      r.commodity || r.komoditas || r.commodityName || r.commodity_name || "";
    const key = MAP[namaKomoditas];
    const hargaRaw = r.price ?? r.harga;
    const harga = Number(hargaRaw);

    if (!key) continue;
    if (!Number.isFinite(harga)) continue;

    const k = `${tanggal}|${key}`;
    const s = agg.get(k) ?? { sum: 0, count: 0, last: harga };
    s.sum += harga;
    s.count += 1;
    s.last = harga;
    agg.set(k, s);
  }

  // Terapkan agregasi ke row tanggal
  for (const [k, v] of agg.entries()) {
    const [tanggal, key] = k.split("|") as [string, keyof MarketRow];
    const row = byDate.get(tanggal)!;
    (row as any)[key] = mode === "avg" ? v.sum / v.count : v.last;
  }

  // Susun rows + atur label minggu hanya pada hari 1,8,15,22,29
  const rows = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => {
      const show = [1, 8, 15, 22, 29].includes(v.day);
      return { ...v, week: show ? v.week : "" };
    });

  // Label bulan untuk judul
  const firstISO: string | undefined =
    (filtered[0]?.date || filtered[0]?.tanggal || fromISO || toISO);
  const monthLabel = firstISO
    ? monthLabelFromISO(firstISO)
    : monthLabelFromISO(new Date().toISOString().slice(0, 10));

  return { rows, monthLabel };
}
