import React from "react";
import { CommodityLineChart } from "./CommodityLineChart";
import { CommoditySelector } from "../CommoditySelector";

type Props = {
  title: string;
  data?: any[];
  stroke?: string;
  height?: number;
  selectedCommodity: string;
  onCommodityChange: (commodity: string) => void;
  placeholder?: string;
};

export function CommodityLineChartWithSelector({
  title,
  data,
  stroke,
  height,
  selectedCommodity,
  onCommodityChange,
  placeholder = "Pilih komoditas"
}: Props) {
  const hasData = data && data.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Rata-rata per tanggal{selectedCommodity ? ` (${selectedCommodity})` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Komoditas:</span>
            <CommoditySelector
              value={selectedCommodity}
              onChange={onCommodityChange}
              placeholder={placeholder}
              className="w-48"
            />
          </div>
        </div>
      </div>
      <div className="p-6" style={{ height: height || 300, minHeight: 300, border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        {selectedCommodity && !hasData ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-sm">Tidak ada data untuk komoditas "{selectedCommodity}"</p>
              <p className="text-xs mt-1">Coba pilih komoditas lain atau ubah filter tanggal/pasar</p>
            </div>
          </div>
        ) : (
          <CommodityLineChart
            title=""
            data={data}
            stroke={stroke}
            height={height}
          />
        )}
      </div>
    </div>
  );
}
