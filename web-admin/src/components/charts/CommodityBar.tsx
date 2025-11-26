import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "../../utils/format";

type AnyRow = Record<string, unknown>;

type Props = {
  data?: AnyRow[];
  title?: string;
  height?: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function CommodityBarChart({
  data,
  title = "Rata-rata Harga Komoditas (Top 10)",
  height = 280,
}: Props) {
  // Normalisasi: pastikan array dan petakan label/value
  const safeData = React.useMemo(() => {
    const src = Array.isArray(data) ? data : [];
    return src
      .map((it) => {
        const label =
          (it?.name as string) ??
          (it?.commodity as string) ??
          (it?.market as string) ??
          (it?.label as string) ??
          "Tidak diketahui";

        const value = num(
          (it as any)?.harga ??
            (it as any)?.value ??
            (it as any)?.avg ??
            (it as any)?.count
        );

        return {
          label: (label ?? "Tidak diketahui").toString().trim() || "Tidak diketahui",
          value,
        };
      })
      .filter((r) => r.value > 0);
  }, [data]);

  // Hitung persentase utk label bawah (kontribusi terhadap total chart)
  const { total, pctByLabel } = React.useMemo(() => {
    const t = safeData.reduce((s, r) => s + r.value, 0);
    const map: Record<string, number> = {};
    safeData.forEach((r) => {
      map[r.label] = t > 0 ? Math.round((r.value / t) * 100) : 0;
    });
    return { total: t, pctByLabel: map };
  }, [safeData]);

  if (!safeData.length) {
    return (
      <div className="p-6 text-sm text-gray-500">Tidak ada data.</div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={safeData}>
        <CartesianGrid strokeDasharray="3 3" />
        {/* Label bawah diganti persen */}
        <XAxis
          dataKey="label"
          interval={0}
          tick={{ fontSize: 12 }}
          tickFormatter={(label: string) => `${pctByLabel[label] ?? 0}%`}
        />
        <YAxis />
        {/* Tooltip tetap pakai rupiah */}
        <Tooltip
          formatter={(v: number, name: string, entry: any) =>
            [formatCurrency(v), entry?.payload?.label ?? name]
          }
        />
        {/* Warna pangan hijau */}
        <Bar dataKey="value" fill="#a9e73eff" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
