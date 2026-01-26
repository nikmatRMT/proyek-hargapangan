import React from "react";
import { CommodityBarChart } from "./CommodityBar";
import { CommoditySelector } from "../CommoditySelector";

type Props = {
  data?: any[];
  title?: string;
  height?: number;
  selectedCommodity: string;
  onCommodityChange: (commodity: string) => void;
  allData: any[];
};

export function CommodityBarChartWithSelector({
  data,
  title = "Rata-rata Harga Komoditas",
  height,
  selectedCommodity,
  onCommodityChange,
  allData
}: Props) {
  // Filter data berdasarkan komoditas yang dipilih
  const filteredData = React.useMemo(() => {
    if (!selectedCommodity) return data;

    // Untuk bar chart, kita filter data berdasarkan komoditas yang dipilih
    // lalu hitung rata-rata harga per pasar untuk komoditas tersebut
    const filtered = allData.filter(item =>
      item.commodity?.toLowerCase() === selectedCommodity.toLowerCase()
    );

    if (filtered.length === 0) return [];

    // Group by market dan hitung rata-rata
    const marketMap = new Map<string, { sum: number; count: number }>();
    filtered.forEach(item => {
      const market = item.market || 'Tidak diketahui';
      const price = Number(item.price) || 0;
      if (price > 0) {
        const existing = marketMap.get(market) || { sum: 0, count: 0 };
        existing.sum += price;
        existing.count += 1;
        marketMap.set(market, existing);
      }
    });

    // Convert ke format yang diharapkan oleh CommodityBarChart
    const result = Array.from(marketMap.entries()).map(([market, stats]) => ({
      name: market,
      value: stats.count > 0 ? stats.sum / stats.count : 0,
    }));

    return result.sort((a, b) => b.value - a.value);
  }, [selectedCommodity, allData, data]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Rata-rata berdasarkan data terpilih{selectedCommodity ? ` (${selectedCommodity})` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <CommoditySelector
              value={selectedCommodity}
              onChange={onCommodityChange}
              placeholder="Semua komoditas"
              className="w-48"
            />
            {/* Export Actions */}
            <div className="flex gap-1 ml-2">
              <button
                className="h-9 px-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                title="Export Rata-rata Semua Pasar"
                onClick={async () => {
                  try {
                    const { exportAveragePriceExcel } = await import('../../utils/exportExcel');
                    // Calculate Avg per Commodity (All Markets)
                    // We can reuse 'data' prop if it is correctly carrying the list, but robustly we recalc from allData.
                    // Recalc logic:
                    const map = new Map<string, { sum: number, count: number }>();
                    allData.forEach(d => {
                      // Normalize commodity name
                      const comm = d.commodity || d.name || d.nama || 'Lainnya';
                      const p = Number(d.price || d.harga || 0);
                      if (p > 0) {
                        const entry = map.get(comm) || { sum: 0, count: 0 };
                        entry.sum += p;
                        entry.count++;
                        map.set(comm, entry);
                      }
                    });
                    const processed = Array.from(map.entries()).map(([k, v]) => ({
                      commodity: k,
                      avg: Math.round(v.sum / v.count)
                    })).sort((a, b) => b.avg - a.avg);

                    await exportAveragePriceExcel({
                      mode: 'all-markets',
                      data: processed,
                      title: 'Rata-rata Harga Komoditas (Semua Pasar)',
                      fileName: 'rata-rata-semua-pasar.xlsx'
                    });
                  } catch (e) {
                    console.error(e);
                    alert('Gagal export');
                  }
                }}
              >
                Excel (Semua)
              </button>
              <button
                className="h-9 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                title="Export Rata-rata Per Pasar"
                onClick={async () => {
                  try {
                    const { exportAveragePriceExcel } = await import('../../utils/exportExcel');
                    // Calculate Avg per Commodity per Market
                    const map = new Map<string, { sum: number, count: number }>();
                    allData.forEach(d => {
                      const comm = d.commodity || d.name || d.nama || 'Lainnya';
                      const mkt = d.market || d.pasar || d.marketName || 'Lainnya';
                      const p = Number(d.price || d.harga || 0);
                      if (p > 0) {
                        const key = `${comm}###${mkt}`;
                        const entry = map.get(key) || { sum: 0, count: 0 };
                        entry.sum += p;
                        entry.count++;
                        map.set(key, entry);
                      }
                    });

                    const processed: any[] = [];
                    map.forEach((v, k) => {
                      const [commodity, market] = k.split('###');
                      processed.push({
                        commodity,
                        market,
                        avg: Math.round(v.sum / v.count)
                      });
                    });

                    await exportAveragePriceExcel({
                      mode: 'per-market',
                      data: processed,
                      title: 'Rata-rata Harga Komoditas Per Pasar',
                      fileName: 'rata-rata-per-pasar.xlsx'
                    });
                  } catch (e) {
                    console.error(e);
                    alert('Gagal export');
                  }
                }}
              >
                Excel (Per Pasar)
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4" style={{ height: 300, minHeight: 300, border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        {selectedCommodity && filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-sm">Tidak ada data untuk komoditas "{selectedCommodity}"</p>
              <p className="text-xs mt-1">Coba pilih komoditas lain atau ubah filter tanggal/pasar</p>
            </div>
          </div>
        ) : (
          <CommodityBarChart
            data={selectedCommodity && filteredData.length > 0 ? filteredData : data}
            title=""
            height={280}
          />
        )}
      </div>
    </div>
  );
}
