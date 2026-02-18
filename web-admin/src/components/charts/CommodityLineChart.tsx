import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "../../utils/format";

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-foreground">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function CommodityLineChart({
  title,
  data,
  series,
  stroke = "#10b981", // Brand green default
  height = 300,
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
          (r as any)?.y ??
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
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground h-full min-h-[200px] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
        Tidak ada data untuk ditampilkan.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={safeSeries}>
        <defs>
          <linearGradient id={`gradient-${stroke}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-800" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
          minTickGap={30}
        />
        <YAxis
          hide={false}
          tick={{ fontSize: 10, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: stroke, strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area
          type="monotone"
          dataKey="y"
          stroke={stroke}
          strokeWidth={3}
          fill={`url(#gradient-${stroke})`}
          activeDot={{ r: 6, strokeWidth: 0, fill: stroke }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
