import { useEffect, useState } from "react";
import { getMarkets, type Market } from "@/api";

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const raw = await getMarkets();
      // raw bisa {data: [...] } atau langsung array, sesuaikan:
      const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      // Normalisasi key supaya konsisten
      const norm = list.map((m) => ({
        id: Number(m.id),
        nama: m.nama ?? m.name ?? m.nama_pasar ?? "",
        name: m.name ?? m.nama ?? m.nama_pasar ?? "",
        nama_pasar: m.nama_pasar ?? m.nama ?? m.name ?? "",
      })) as Market[];
      setMarkets(norm);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat pasar");
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return { markets, loading, error, refresh };
}
