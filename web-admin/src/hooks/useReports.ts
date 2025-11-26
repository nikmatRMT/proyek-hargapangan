// src/hooks/useReports.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchReports } from "../api";

export type UseReportsParams = {
  from?: string; // 'YYYY-MM-DD'
  to?: string;   // 'YYYY-MM-DD'
  market?: number | "all";
  sort?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  /** Jika berubah → refetch paksa (mis. SSE event, selesai import, selesai edit) */
  refreshKey?: number;
};

export function useReports(params: UseReportsParams) {
  const {
    from,
    to,
    market = "all",
    sort = "desc",
    page = 1,
    pageSize = 2000,
    refreshKey = 0,
  } = params;

  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  // simpan params terbaru untuk compare
  const lastParams = useRef<string>("");

  const queryKey = useMemo(() => {
    const key = JSON.stringify({ from, to, market, sort, page, pageSize });
    return key;
  }, [from, to, market, sort, page, pageSize]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReports({
        from,
        to,
        market,
        sort,
        page,
        pageSize,
      });
      const rows = Array.isArray(res?.rows) ? res.rows : [];
      setData(rows);
      setTotal(Number(res?.total ?? rows.length));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // hindari fetch berlebih kalau params belum berubah
    const sig = `${queryKey}|refresh=${refreshKey}`;
    if (lastParams.current === sig) return;
    lastParams.current = sig;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, refreshKey]);

  return { data, total, loading, error, refetch: load };
}

export default useReports;
