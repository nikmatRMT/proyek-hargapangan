import React, { useEffect, useState } from 'react';
import { MapPin, Pencil } from 'lucide-react';
import type { ReportRow } from '../types'; // dari hooks/ ke root src/
import { formatCurrency } from '../utils/format';
import { getMarkets, getCommodities, patchPriceById } from '../api';

const DataTable: React.FC<{ rows: ReportRow[]; loading:boolean; error:string|null; }> = ({ rows, loading, error }) => {
  const [marketsOptions, setMarketsOptions] = useState<Array<{ value: any; label: string }>>([]);
  const [commoditiesOptions, setCommoditiesOptions] = useState<Array<{ value: any; label: string }>>([]);
  const [editMarketRowId, setEditMarketRowId] = useState<string|number|null>(null);
  const [editCommodityRowId, setEditCommodityRowId] = useState<string|number|null>(null);
  const [editMarketVal, setEditMarketVal] = useState<string|number|undefined>(undefined);
  const [editCommodityVal, setEditCommodityVal] = useState<string|number|undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string|null>(null);

  useEffect(() => {
    let mounted = true;
    getMarkets().then((res:any) => {
      const data = res?.data || res || [];
      if (!mounted) return;
      setMarketsOptions(data.map((m:any) => ({ value: m.id, label: m.nama_pasar || m.name || m.nama || String(m.id) })));
    }).catch(() => {});
    getCommodities().then((res:any) => {
      const data = res?.data || res || [];
      if (!mounted) return;
      setCommoditiesOptions(data.map((k:any) => ({ value: k.id, label: k.nama_komoditas || k.name || k.nama || String(k.id) })));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                {editMarketRowId === item.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <select
                      className="px-2 py-1 border rounded text-sm"
                      value={editMarketVal ?? ""}
                      onChange={(e) => setEditMarketVal(e.target.value)}
                    >
                      <option value="">-- Pilih Pasar --</option>
                      {marketsOptions.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <div className="flex flex-row gap-1 w-full mt-1 justify-center items-center">
                      <button
                        className="flex items-center gap-0.5 px-1.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                        onClick={async () => {
                          setSaving(true);
                          try {
                            await patchPriceById(Number(item.id), { market_id: editMarketVal ? Number(editMarketVal) : undefined });
                            item.market_name = marketsOptions.find(m => String(m.value) === String(editMarketVal))?.label || item.market_name;
                            setEditMarketRowId(null);
                          } catch (e:any) { setErrMsg(e?.message || 'Gagal menyimpan'); } finally { setSaving(false); }
                        }}
                        type="button"
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M9.293 16.293a1 1 0 0 0 1.414 0l7-7a1 1 0 1 0-1.414-1.414L10 13.586l-2.293-2.293a1 1 0 1 0-1.414 1.414l3 3Z"/></svg>
                        Simpan
                      </button>
                      <button
                        className="flex items-center gap-0.5 px-1.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                        onClick={() => { setEditMarketRowId(null); setErrMsg(null); }}
                        type="button"
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M6.225 6.225a1 1 0 0 1 1.414 0L12 10.586l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 12l4.361 4.361a1 1 0 1 1-1.414 1.414L12 13.414l-4.361 4.361a1 1 0 1 1-1.414-1.414L10.586 12 6.225 7.639a1 1 0 0 1 0-1.414Z"/></svg>
                        Batal
                      </button>
                    </div>
                    {errMsg && <div className="text-xs text-red-600">{errMsg}</div>}
                  </div>
                ) : (
                    <div className="flex items-center gap-2">
                    <span className="flex-1">{item.market_name}</span>
                    <button className="inline-flex items-center justify-center p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-50" title="Edit pasar" onClick={() => { setEditMarketRowId(item.id); setEditMarketVal(item.market_id ?? undefined); setErrMsg(null); }} aria-label="Edit pasar">
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                {editCommodityRowId === item.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <select
                      className="px-2 py-1 border rounded text-sm"
                      value={editCommodityVal ?? ""}
                      onChange={(e) => setEditCommodityVal(e.target.value)}
                    >
                      <option value="">-- Pilih Komoditas --</option>
                      {commoditiesOptions.map(k => (
                        <option key={k.value} value={k.value}>{k.label}</option>
                      ))}
                    </select>
                    <div className="flex flex-row gap-1 w-full mt-1 justify-center items-center">
                      <button
                        className="flex items-center gap-0.5 px-1.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                        onClick={async () => {
                          setSaving(true);
                          try {
                            await patchPriceById(Number(item.id), { komoditas_id: editCommodityVal ? Number(editCommodityVal) : undefined });
                            item.commodity_name = commoditiesOptions.find(k => String(k.value) === String(editCommodityVal))?.label || item.commodity_name;
                            setEditCommodityRowId(null);
                          } catch (e:any) { setErrMsg(e?.message || 'Gagal menyimpan'); } finally { setSaving(false); }
                        }}
                        type="button"
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M9.293 16.293a1 1 0 0 0 1.414 0l7-7a1 1 0 1 0-1.414-1.414L10 13.586l-2.293-2.293a1 1 0 1 0-1.414 1.414l3 3Z"/></svg>
                        Simpan
                      </button>
                      <button
                        className="flex items-center gap-0.5 px-1.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                        onClick={() => { setEditCommodityRowId(null); setErrMsg(null); }}
                        type="button"
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M6.225 6.225a1 1 0 0 1 1.414 0L12 10.586l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 12l4.361 4.361a1 1 0 1 1-1.414 1.414L12 13.414l-4.361 4.361a1 1 0 1 1-1.414-1.414L10.586 12 6.225 7.639a1 1 0 0 1 0-1.414Z"/></svg>
                        Batal
                      </button>
                    </div>
                    {errMsg && <div className="text-xs text-red-600">{errMsg}</div>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex-1">{item.commodity_name} <span className="text-gray-500 text-xs">({item.unit})</span></span>
                    <button className="inline-flex items-center justify-center p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-50" title="Edit komoditas" onClick={() => { setEditCommodityRowId(item.id); setEditCommodityVal(item.commodity_id ?? undefined); setErrMsg(null); }} aria-label="Edit komoditas">
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
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

}

export default DataTable;
