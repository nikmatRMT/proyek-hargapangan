import { useEffect, useState } from "react";

export type Layout = Record<string, number>;

const PREFIX = "table-layout:v1:";

export function useColumnLayout(tableId: string, defaults: Layout) {
  const key = PREFIX + tableId;
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(layout));
    } catch (e) {
      // ignore storage errors
    }
  }, [key, layout]);

  const reset = () => setLayout(defaults);

  return { layout, setLayout, reset };
}

export default useColumnLayout;
