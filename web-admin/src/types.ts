// src/types.ts
export type Unit = 'kg' | 'liter' | string;

export interface ReportRow {
  id: number;
  date: string;                 // 'YYYY-MM-DD'
  market_name: string;          // 'Pasar Bauntung' | 'Pasar Jati' | ...
  commodity_name: string;       // 'Beras', 'Cabe Rawit', dst
  unit: Unit;                   // 'kg' | 'liter' | lainnya
  price: number;                // harga dalam rupiah (angka)
  user_name: string;            // nama petugas / sumber ('import' untuk hasil import)

  // opsional
  gps_lat?: number | null;
  gps_lng?: number | null;
  photo_url?: string | null;

  // kolom baru (opsional) — salah satu bisa dipakai
  notes?: string | null;        // preferensi utama (lebih netral)
  keterangan?: string | null;   // alias; dipakai jika app kirim 'keterangan'
}
