import React from "react";
import { CommodityLineChart } from "./CommodityLineChart";
import { CommoditySelector } from "../CommoditySelector";
import { get } from "../../api";

type Props = {
  title: string;
  data?: any[];
  stroke?: string;
  height?: number;
  selectedCommodity: string;
  onCommodityChange: (commodity: string) => void;
  placeholder?: string;
  marketId?: number | 'all';
  marketName?: string;
  marketAddress?: string;
};

export function CommodityLineChartWithSelector({
  title,
  data,
  stroke,
  height,
  selectedCommodity,
  onCommodityChange,
  placeholder = "Pilih komoditas",
  marketId,
  marketName,
  marketAddress,
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
            <button
              className="ml-2 h-9 px-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
              title="Export Excel (komoditas per bulan)"
              onClick={async () => {
                const params = new URLSearchParams(window.location.search);
                const from = params.get('from') || '';
                const to = params.get('to') || '';
                const marketProp = typeof marketId !== 'undefined' ? marketId : undefined;
                const market = (typeof marketProp !== 'undefined' && marketProp !== null)
                  ? (marketProp === 'all' ? 'all' : String(marketProp))
                  : (params.get('market') || 'all');
                if (!selectedCommodity) {
                  alert('Pilih komoditas terlebih dahulu');
                  return;
                }
                try {
                  if (!Array.isArray(data) || data.length === 0) {
                    alert('Tidak ada data untuk komoditas yang dipilih.');
                    return;
                  }
                  const { loadWorkbookCtor } = await import('../../utils/exportExcel');
                  const Workbook = await loadWorkbookCtor();
                  const wb = new Workbook();
                  if (market === 'all') {
                    alert('Export Excel untuk "Semua Pasar" dinonaktifkan. Silakan pilih pasar tertentu.');
                    return;
                  } else {
                    // Satu pasar: sheet tunggal
                    const ws = wb.addWorksheet('Sheet1');
                    let mName = marketName ?? 'Semua Pasar';
                    let mAddr = marketAddress ?? '';
                    if ((!mName || mName === 'Semua Pasar') && market && market !== 'all') {
                      try {
                        const id = Number(String(market));
                        let mdata: any = null;
                        if (Number.isFinite(id) && id > 0) {
                          const mres: any = await get(`/api/markets/${id}`);
                          mdata = Array.isArray(mres) ? mres[0] : (mres?.rows && Array.isArray(mres.rows) ? mres.rows[0] : mres);
                        } else {
                          try {
                            const listRes: any = await get('/api/markets');
                            const list = Array.isArray(listRes) ? listRes : Array.isArray(listRes?.rows) ? listRes.rows : [];
                            mdata = (list || []).find((x: any) => {
                              const label = (x.nama_pasar || x.name || x.nama || '').toString().toLowerCase();
                              return label === String(market).toLowerCase();
                            }) || null;
                          } catch (e) {
                            console.warn('[Export Excel Komoditas] failed fetching markets list', e);
                          }
                        }
                        if (mdata) {
                          mName = mdata?.nama_pasar || mdata?.name || mdata?.nama || `Pasar ${market}`;
                          mAddr = mdata?.alamat || mdata?.address || '';
                        }
                      } catch (e) {
                        console.warn('[Export Excel Komoditas] fetch market failed', e);
                      }
                    }
                    const chunkSize = 10;
                    const chunks = [];
                    for (let i = 0; i < data.length; i += chunkSize) {
                      chunks.push(data.slice(i, i + chunkSize));
                    }
                    const totalCols = Math.max(2 + chunks.length * 2 - 1, 3);
                    const midStart = Math.floor((2 + totalCols) / 2) - 1;
                    const midEnd = midStart + 2;
                    ws.mergeCells(1, midStart, 1, midEnd);
                    ws.getCell(1, midStart).value = mName;
                    ws.getCell(1, midStart).font = { name: 'Calibri', size: 12, bold: true };
                    ws.getCell(1, midStart).alignment = { horizontal: 'center', vertical: 'middle' };
                    ws.mergeCells(2, midStart, 2, midEnd);
                    ws.getCell(2, midStart).value = mAddr;
                    ws.getCell(2, midStart).font = { name: 'Calibri', size: 11 };
                    ws.getCell(2, midStart).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    ws.mergeCells(3, midStart, 3, midEnd);
                    ws.getCell(3, midStart).value = `Harga ${selectedCommodity}`;
                    ws.getCell(3, midStart).font = { name: 'Calibri', size: 14, bold: true };
                    ws.getCell(3, midStart).alignment = { horizontal: 'center', vertical: 'middle' };
                    let col = 2;
                    for (let i = 0; i < chunks.length; i++) {
                      ws.getColumn(col).width = 15;
                      ws.getColumn(col + 1).width = 12;
                      ws.getCell(5, col).value = 'Tanggal';
                      ws.getCell(5, col + 1).value = 'Harga';
                      ws.getCell(5, col).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                      ws.getCell(5, col + 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                      ws.getCell(5, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
                      ws.getCell(5, col + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
                      ws.getCell(5, col).alignment = { horizontal: 'center', vertical: 'middle' };
                      ws.getCell(5, col + 1).alignment = { horizontal: 'center', vertical: 'middle' };
                      ws.getCell(5, col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                      ws.getCell(5, col + 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                      col += 2;
                    }
                    for (let i = 0; i < chunkSize; i++) {
                      col = 2;
                      for (let j = 0; j < chunks.length; j++) {
                        const row = chunks[j][i];
                        ws.getCell(6 + i, col).value = row ? (row.tanggal || row.date) : '';
                        ws.getCell(6 + i, col + 1).value = row ? (row.harga || row.price || row.avg) : '';
                        ws.getCell(6 + i, col).alignment = { horizontal: 'center', vertical: 'middle' };
                        ws.getCell(6 + i, col + 1).alignment = { horizontal: 'center', vertical: 'middle' };
                        ws.getCell(6 + i, col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        ws.getCell(6 + i, col + 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        col += 2;
                      }
                    }
                    const buf = await wb.xlsx.writeBuffer();
                    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `komoditas-${selectedCommodity}-${market}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(downloadUrl);
                    document.body.removeChild(a);
                  }
                } catch (error) {
                  console.error('[Export Excel Komoditas] Error:', error);
                  alert('Gagal export Excel: ' + (error?.message || error));
                }
              }}
            >
              Excel (Komoditas)
            </button>
            <button
              className="ml-2 h-9 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
              title="Export PDF (komoditas per bulan)"
              onClick={async () => {
                const params = new URLSearchParams(window.location.search);
                const from = params.get('from') || '';
                const to = params.get('to') || '';
                // Gunakan prop marketId jika ada, fallback ke URL
                const marketProp = typeof marketId !== 'undefined' ? marketId : undefined;
                const market = (typeof marketProp !== 'undefined' && marketProp !== null)
                  ? (marketProp === 'all' ? 'all' : String(marketProp))
                  : (params.get('market') || 'all');
                if (!selectedCommodity) {
                  alert('Pilih komoditas terlebih dahulu');
                  return;
                }
                if (market === 'all') {
                  alert('Export PDF untuk "Semua Pasar" dinonaktifkan. Silakan pilih pasar tertentu.');
                  return;
                }
                try {
                  // Debug: log parameters before calling backend
                  console.log('[Export PDF Komoditas] calling with', { from, to, market, komoditas: selectedCommodity });
                  const url = `/api/export-pdf-komoditas?from=${from}&to=${to}&market=${market}&komoditas=${encodeURIComponent(selectedCommodity)}`;
                  const response = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/pdf' },
                  });
                  if (!response.ok) {
                    let errorMsg = `HTTP error! status: ${response.status}`;
                    try {
                      const errorData = await response.json();
                      if (errorData.error) errorMsg = errorData.error;
                    } catch (e) { }
                    throw new Error(errorMsg);
                  }
                  const blob = await response.blob();
                  const downloadUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = `komoditas-${selectedCommodity}-${from || 'all'}-${to || 'all'}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(downloadUrl);
                  document.body.removeChild(a);
                } catch (error: any) {
                  console.error('[Export PDF Komoditas] Error:', error);
                  alert('Gagal export PDF: ' + (error?.message || error));
                }
              }}
            >
              PDF (Komoditas)
            </button>
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
