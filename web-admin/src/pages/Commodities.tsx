import React, { useEffect, useState, useMemo } from 'react';
import { getCommodities, createCommodity, updateCommodity, deleteCommodity } from '@/api';
import { FileSpreadsheetIcon, FileTextIcon, PlusIcon, Search, Pencil, Trash2 } from 'lucide-react';
import { exportSimpleTable } from '@/utils/exportExcel';

export default function Commodities() {
  const [rows, setRows] = useState<Array<{ id: number; nama_komoditas: string }>>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<{ id?: number; nama_komoditas: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getCommodities();
      const list = Array.isArray((res as any).rows) ? (res as any).rows : Array.isArray(res) ? res : [];
      setRows(list);
    } catch (e: any) {
      console.error(e);
      setRows([]);
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => String(r.nama_komoditas || '').toLowerCase().includes(q) || String(r.id).includes(q));
  }, [rows, query]);

  function openAdd() { setEditing({ nama_komoditas: '' }); setShowModal(true); setErr(null); }
  function openEdit(r: any) { setEditing({ id: r.id, nama_komoditas: r.nama_komoditas }); setShowModal(true); setErr(null); }

  async function save() {
    if (!editing) return;
    const name = (editing.nama_komoditas || '').trim();
    if (!name) { setErr('Nama komoditas wajib'); return; }
    try {
      if (editing.id) {
        await updateCommodity(editing.id, name);
      } else {
        await createCommodity(name);
      }
      setShowModal(false);
      setEditing(null);
      load();
    } catch (e: any) {
      console.error(e);
      setErr(String(e?.data?.message || e?.message || e));
    }
  }

  async function doDelete(id: number) {
    if (!confirm('Hapus komoditas ini? Tindakan tidak bisa dibatalkan.')) return;
    try {
      await deleteCommodity(id);
      load();
    } catch (e) {
      console.error(e);
      const msg = (e as any)?.data?.message || (e as any)?.message || 'Gagal hapus. Cek console.';
      alert(msg);
    }
  }

  const handleExportExcel = async () => {
    if (filtered.length === 0) return alert('Tidak ada data untuk diexport');
    try {
      const dataToExport = filtered.map((r, i) => ({
        No: i + 1,
        ID: r.id,
        'Nama Komoditas': r.nama_komoditas
      }));

      await exportSimpleTable({
        title: 'Daftar Komoditas',
        headers: ['No', 'ID', 'Nama Komoditas'],
        data: dataToExport.map(Object.values),
        fileName: 'Daftar_Komoditas.xlsx',
        columns: [
          { width: 5, alignment: { horizontal: 'center' } },
          { width: 10, alignment: { horizontal: 'center' } },
          { width: 50, alignment: { horizontal: 'left' } }
        ]
      });
    } catch (e) {
      console.error(e);
      alert('Gagal export Excel');
    }
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) return alert('Tidak ada data untuk diexport');
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('Daftar Komoditas', 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${filtered.length} items`, 14, 22);

      const tableData = filtered.map((r, i) => [i + 1, r.id, r.nama_komoditas]);

      (autoTable as any)(doc, {
        startY: 25,
        head: [['No', 'ID', 'Nama Komoditas']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] }, // Greenish
        styles: { fontSize: 10, cellPadding: 3 },
      });

      doc.save('Daftar_Komoditas.pdf');
    } catch (e) {
      console.error(e);
      alert('Gagal export PDF');
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kelola Komoditas</h2>
          <div className="text-sm text-gray-500">Daftar master komoditas sistem</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-all"
              placeholder="Cari nama atau ID..."
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
              <FileSpreadsheetIcon className="h-4 w-4" /> Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
              <FileTextIcon className="h-4 w-4" /> PDF
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
              <PlusIcon className="h-4 w-4" /> Tambah
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Memuat data...</div>}
      {err && <div className="p-4 mb-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{err}</div>}

      <div className="bg-white border boundary-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold w-24">ID</th>
                <th className="px-6 py-4 font-semibold">Nama Komoditas</th>
                <th className="px-6 py-4 font-semibold text-right w-48">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.id}</td>
                  <td className="px-6 py-3 text-gray-700">{r.nama_komoditas}</td>
                  <td className="px-6 py-3 text-right flex justify-end gap-2">
                    <button onClick={() => openEdit(r)} className="p-2 text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => doDelete(r.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{editing?.id ? 'Edit Komoditas' : 'Tambah Komoditas Baru'}</h3>
              <p className="text-sm text-gray-500 mt-1">Isi detail komoditas di bawah ini.</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Komoditas</label>
                <input
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Contoh: Beras Premium"
                  value={editing?.nama_komoditas ?? ''}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, nama_komoditas: e.target.value } : { nama_komoditas: e.target.value })}
                />
              </div>
              {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{err}</div>}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setEditing(null); }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={save}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
