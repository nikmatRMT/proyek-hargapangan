// src/hooks/useMarkets.ts
import { useEffect, useState } from "react";
import { fetchMarkets } from "@/api";

export type Market = { id: number; nama_pasar: string };

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchMarkets();
        if (alive) setMarkets(Array.isArray(list) ? list : []);
      } catch { if (alive) setMarkets([]); }
    })();
    return () => { alive = false; };
  }, []);
  return [{ id: 0, nama_pasar: "Semua Pasar" }, ...markets];
}
