import React, { useEffect, useState, useMemo } from 'react';
import { getMarkets, createMarket, updateMarket, deleteMarket } from '@/api';

export default function Markets() {
  const [rows, setRows] = useState<Array<{ id: number; nama_pasar: string }>>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<{ id?: number; nama_pasar: string } | null>(null);
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

  function openAdd() { setEditing({ nama_pasar: '' }); setShowModal(true); setErr(null); }
  function openEdit(r: any) { setEditing({ id: r.id, nama_pasar: r.nama_pasar }); setShowModal(true); setErr(null); }

  async function save() {
    if (!editing) return;
    const name = (editing.nama_pasar || '').trim();
    if (!name) { setErr('Nama pasar wajib'); return; }
    try {
      if (editing.id) {
        await updateMarket(editing.id, name);
      } else {
        await createMarket(name);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold">Kelola Pasar</h2>
          <div className="text-sm text-gray-600">Daftar pasar dan pengaturan cepat</div>
        </div>
        <div className="flex items-center gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="px-3 py-2 border rounded-md text-sm" placeholder="Cari nama atau ID..." />
          <button onClick={openAdd} className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Tambah Pasar</button>
        </div>
      </div>

      {loading && <div>Memuat...</div>}
      {err && <div className="text-red-600">{err}</div>}

      <div className="overflow-x-auto bg-white border rounded-md">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Nama Pasar</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 border-b">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="even:bg-gray-50">
                <td className="px-4 py-3 align-top text-sm text-gray-800">{r.id}</td>
                <td className="px-4 py-3 align-top text-sm text-gray-900">{r.nama_pasar}</td>
                <td className="px-4 py-3 align-top text-sm text-right">
                  <button onClick={() => openEdit(r)} className="px-3 py-1 bg-yellow-500 text-white rounded-md mr-2 hover:bg-yellow-600">Edit</button>
                  <button onClick={() => doDelete(r.id)} className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">Hapus</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">Tidak ada data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="font-medium mb-3">{editing?.id ? 'Edit Pasar' : 'Tambah Pasar'}</h3>
            <input className="w-full p-2 border rounded mb-2" value={editing?.nama_pasar ?? ''} onChange={(e) => setEditing(prev => prev ? {...prev, nama_pasar: e.target.value} : { nama_pasar: e.target.value })} />
            {err && <div className="text-red-600 mb-2">{err}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="px-3 py-2 border rounded">Batal</button>
              <button onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
