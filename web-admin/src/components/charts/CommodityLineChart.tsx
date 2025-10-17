import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "../../utils/format";

// Bisa menerima:
// - data: [{ tanggal, harga }]   // bentuk lama
// - data: [{ date, avg|value|price }]
// - series: alias dari data (opsional)
type AnyRow = Record<string, unknown>;

type Props = {
  title: string;
  data?: AnyRow[];
  series?: AnyRow[];
  stroke?: string;
  height?: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function CommodityLineChart({
  title,
  data,
  series,
  stroke = "#2563eb",
  height = 250,
}: Props) {
  const src = Array.isArray(series) ? series : Array.isArray(data) ? data : [];

  const safeSeries = React.useMemo(() => {
    const out = src
      .map((r) => {
        const x =
          (r?.tanggal as string) ??
          (r?.date as string) ??
          (r?.x as string) ??
          "";
        const y = num(
          (r as any)?.harga ??
            (r as any)?.avg ??
            (r as any)?.value ??
            (r as any)?.price
        );
        return { date: x, y };
      })
      .filter((r) => r.date && r.y > 0);

    out.sort((a, b) => a.date.localeCompare(b.date));
    return out;
  }, [src]);

  if (!safeSeries.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">Rata-rata per tanggal</p>
        </div>
        <div className="p-6 text-sm text-gray-500">Tidak ada data untuk ditampilkan.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">Rata-rata per tanggal</p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={safeSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Line
              type="monotone"
              dataKey="y"
              stroke={stroke}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
