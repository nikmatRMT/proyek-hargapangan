import React from "react";
import { MarketPie } from "./MarketPie";

type Props = {
  data?: any[];
  title?: string;
  height?: number;
  allData?: any[];
};

export function MarketPieWithSelector({
  data,
  title = "Distribusi Pasar",
  height,
  allData
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Persentase data per pasar (semua komoditas)
            </p>
          </div>
        </div>
      </div>
      <div className="p-6" style={{ height: height || 260, minHeight: 260, border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        {!data || data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-sm">Tidak ada data untuk ditampilkan</p>
              <p className="text-xs mt-1">Coba ubah filter tanggal atau pilih pasar yang berbeda</p>
            </div>
          </div>
        ) : (
          <MarketPie
            data={data}
            title=""
            height={height}
          />
        )}
      </div>
    </div>
  );
}
