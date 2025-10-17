import React from 'react';
import { MapPin } from 'lucide-react';
import type { ReportRow } from '../types'; // dari hooks/ ke root src/
import { formatCurrency } from '../utils/format';

const DataTable: React.FC<{ rows: ReportRow[]; loading:boolean; error:string|null; }> = ({ rows, loading, error }) => (
  <div className="panel">
    <div className="panel-header">
      <h2 className="text-lg font-semibold text-gray-900">Data Harga Komoditas</h2>
      <p className="text-sm text-gray-600 mt-1">Data laporan harga komoditas pasar</p>
    </div>

    {loading && <div className="p-6 text-sm text-gray-600">Memuat data…</div>}
    {error && <div className="p-6 text-sm text-red-600">{error}</div>}

    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Tanggal','Pasar','Komoditas','Harga','Petugas','Lokasi (GPS)','Trend'].map(h => (
              <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map(item => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">{item.date}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">{item.market_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                {item.commodity_name} <span className="text-gray-500 text-xs">({item.unit})</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-gray-200">
                <span className="font-medium text-gray-900">{formatCurrency(item.price)}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">{item.user_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">
                {(item.gps_lat != null && item.gps_lng != null)
                  ? (<div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{item.gps_lat}, {item.gps_lng}</span>
                    </div>)
                  : '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm"><span className="text-gray-500">—</span></td>
            </tr>
          ))}

          {!loading && !error && rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">Belum ada data pada rentang ini.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default DataTable;
