import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createCommodity } from '@/api';

export default function CreateMissingCommoditiesModal({
  names,
  onClose,
  onCreated,
}: {
  names: string[];
  onClose: () => void;
  onCreated?: (created: string[]) => void;
}) {
  const [items, setItems] = useState(() => names.map((n) => ({ name: n, unit: '(Rp/Kg)' })));
  const [busy, setBusy] = useState(false);

  function update(idx: number, patch: Partial<{ name: string; unit: string }>) {
    setItems((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleCreateAll() {
    setBusy(true);
    const created: string[] = [];
    for (const it of items) {
      try {
        await createCommodity(it.name);
        created.push(it.name);
      } catch (e) {
        console.warn('[CreateMissing] failed create', it.name, e);
      }
    }
    setBusy(false);
    onCreated?.(created);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 grid place-items-center">
      <div className="bg-white rounded-lg p-4 w-[720px] max-w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Buat Komoditas Baru</h3>
          <button onClick={onClose} className="text-sm text-gray-600">Tutup</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">Periksa nama komoditas yang tidak dikenali. Edit bila perlu lalu klik <b>Buat Semua</b>.</p>

        <div className="max-h-64 overflow-auto border rounded p-2 mb-3">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <input className="border px-2 py-1 flex-1" value={it.name} onChange={(e) => update(idx, { name: e.target.value })} />
              <input className="border px-2 py-1 w-48" value={it.unit} onChange={(e) => update(idx, { unit: e.target.value })} />
              <button onClick={() => setItems((s) => s.filter((_, i) => i !== idx))} className="px-2 py-1 border rounded">Hapus</button>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-gray-500">Tidak ada item.</div>}
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="ghost">Batal</Button>
          <Button onClick={handleCreateAll} disabled={busy || items.length === 0}>{busy ? 'Membuat…' : 'Buat Semua'}</Button>
        </div>
      </div>
    </div>
  );
}
