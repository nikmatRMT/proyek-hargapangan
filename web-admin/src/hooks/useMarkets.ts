// src/hooks/useMarkets.ts
import { useEffect, useState } from "react";
import { getMarkets } from "@/api";

export type Market = { id: number; nama_pasar: string };

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getMarkets();
        const list = Array.isArray((res as any)?.rows) ? (res as any).rows : (Array.isArray(res) ? res : []);
        if (alive) setMarkets(list);
      } catch { if (alive) setMarkets([]); }
    })();
    return () => { alive = false; };
  }, []);
  return [{ id: 0, nama_pasar: "Semua Pasar" }, ...markets];
}
