import React, { useEffect, useState, useMemo } from 'react';
import { getMarkets, createMarket, updateMarket, deleteMarket } from '@/api';
import { Store, Plus, Search, Pencil, Trash2, MapPin, Loader2, X, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportSimpleTable } from '@/utils/exportExcel';

export default function Markets() {
  const [rows, setRows] = useState<Array<{ id: number; nama_pasar: string; alamat?: string }>>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<{ id?: number; nama_pasar: string; alamat?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getMarkets();
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
    return rows.filter(r => String(r.nama_pasar || '').toLowerCase().includes(q) || String(r.id).includes(q));
  }, [rows, query]);

  function openAdd() { setEditing({ nama_pasar: '', alamat: '' }); setShowModal(true); setErr(null); }
  function openEdit(r: any) { setEditing({ id: r.id, nama_pasar: r.nama_pasar, alamat: r.alamat || '' }); setShowModal(true); setErr(null); }

  async function save() {
    if (!editing) return;
    const name = (editing.nama_pasar || '').trim();
    const alamat = (editing.alamat || '').trim();
    if (!name) { setErr('Nama pasar wajib'); return; }
    try {
      if (editing.id) {
        await updateMarket(editing.id, name, alamat);
      } else {
        await createMarket(name, alamat);
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
    if (!confirm('Hapus pasar ini? Tindakan tidak bisa dibatalkan.')) return;
    try {
      await deleteMarket(id);
      load();
    } catch (e) {
      console.error(e);
      const msg = (e as any)?.data?.message || (e as any)?.message || 'Gagal hapus. Cek console.';
      alert(msg);
    }
  }


  const handleExportExcel = async () => {
    try {
      if (filtered.length === 0) return alert('Tidak ada data untuk diexport.');

      const dataToExport = filtered.map((r, i) => ({
        No: i + 1,
        ID: r.id,
        'Nama Pasar': r.nama_pasar,
        Alamat: r.alamat || '-'
      }));

      await exportSimpleTable({
        title: 'Daftar Pasar',
        headers: ['No', 'ID', 'Nama Pasar', 'Alamat'],
        data: dataToExport.map(Object.values),
        fileName: 'daftar-pasar.xlsx',
        columns: [
          { width: 5, alignment: { horizontal: 'center' } },
          { width: 10, alignment: { horizontal: 'center' } },
          { width: 30, alignment: { horizontal: 'left' } },
          { width: 60, alignment: { horizontal: 'left', wrapText: true } }
        ]
      });
    } catch (e: any) {
      console.error(e);
      alert('Gagal export Excel: ' + e.message);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (filtered.length === 0) return alert('Tidak ada data untuk diexport.');

      // Dynamic import jsPDF
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Title
      doc.setFontSize(16);
      doc.text('Daftar Pasar', 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${filtered.length} pasar`, 14, 22);

      // Table
      (autoTable as any)(doc, {
        startY: 25,
        head: [['No', 'ID', 'Nama Pasar', 'Alamat']],
        body: filtered.map((r, i) => [i + 1, r.id, r.nama_pasar, r.alamat || '-']),
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] } // Green-600 like
      });

      doc.save('daftar-pasar.pdf');
    } catch (e: any) {
      console.error(e);
      alert('Gagal export PDF. Pastikan module jspdf terinstall.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Store className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              Kelola Pasar
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Daftar pasar dan pengaturan lokasi pemantauan harga
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 ml-2">
              <Plus className="w-4 h-4" /> Tambah Pasar
            </Button>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              placeholder="Cari pasar..."
            />
          </div>
          <div className="text-sm text-gray-500">
            Total: <strong>{filtered.length}</strong> pasar
          </div>
        </div>

        {/* Error / Loading */}
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {err}
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
                <tr>
                  <th className="px-6 py-4 w-20">ID</th>
                  <th className="px-6 py-4">Nama Pasar</th>
                  <th className="px-6 py-4">Alamat</th>
                  <th className="px-6 py-4 text-right w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      Tidak ada data pasar yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-5 font-mono text-gray-400 text-base">#{r.id}</td>
                      <td className="px-6 py-5 font-medium text-gray-900 dark:text-gray-100 text-base">{r.nama_pasar}</td>
                      <td className="px-6 py-5 text-gray-500 dark:text-gray-400 text-base">
                        {r.alamat ? (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-5 h-5 mt-1 text-gray-400 shrink-0" />
                            <span className="line-clamp-2">{r.alamat}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => doDelete(r.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-gray-900">{editing?.id ? 'Edit Pasar' : 'Tambah Pasar Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nama Pasar <span className="text-red-500">*</span></label>
                <Input
                  value={editing?.nama_pasar ?? ''}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, nama_pasar: e.target.value } : { nama_pasar: e.target.value })}
                  placeholder="Contoh: Pasar Bauntung"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Alamat Lengkap</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editing?.alamat ?? ''}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, alamat: e.target.value } : { nama_pasar: '', alamat: e.target.value })}
                  placeholder="Contoh: Jl. RO Ulin No. 1..."
                />
              </div>

              {err && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{err}</p>}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
              <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
