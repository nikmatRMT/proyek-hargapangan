// src/components/ImportExcel.tsx
import React, { useMemo, useRef, useState } from 'react';
import { uploadExcel, createCommodity } from '../api';

type Market = { id: number; nama?: string; name?: string; nama_pasar?: string };

interface ImportExcelProps {
  markets: Market[];
  selectedMarketId: number | 'all';
  onDone?: () => void; // panggil untuk refetch data tabel setelah impor
}

function getMarketLabel(m?: Market) {
  if (!m) return '';
  return m.nama_pasar ?? m.nama ?? m.name ?? `Pasar #${m.id}`;
}

export default function ImportExcel({
  markets,
  selectedMarketId,
  onDone,
}: ImportExcelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [unknownNames, setUnknownNames] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Default: bulk = true (impor multi-bulan dari satu file)
  const [bulk, setBulk] = useState(true);
  const [truncate, setTruncate] = useState(false);
  const [rekap, setRekap] = useState(false);

  // Jika bulk = false, wajib isi bulan & tahun
  const now = new Date();
  const [month, setMonth] = useState(() =>
    String(now.getMonth() + 1).padStart(2, '0')
  );
  const [year, setYear] = useState(() => String(now.getFullYear()));

  const market = useMemo(
    () => markets.find((m) => m.id === Number(selectedMarketId)),
    [markets, selectedMarketId]
  );

  async function handleImport() {
    if (!file) return alert('Pilih file Excel terlebih dahulu (.xlsx/.xls).');

    // Kalau rekap = true, biarkan server coba deteksi pasar per-sheet.
    // Hanya paksa pilih pasar kalau rekap === false.
    if (!rekap && (selectedMarketId === 'all' || !market)) {
      return alert('Wajib pilih PASAR tertentu sebelum melakukan impor.');
    }

    if (!bulk) {
      if (!month || !year) {
        return alert('Isi Bulan & Tahun untuk mode impor satu-bulan.');
      }
      if (!/^(0[1-9]|1[0-2])$/.test(month)) {
        return alert('Format bulan harus "01".."12".');
      }
      if (!/^\d{4}$/.test(year)) {
        return alert('Format tahun harus 4 digit, misalnya "2025".');
      }
    }

    setBusy(true);
    try {
      const res = await uploadExcel({
        file,
        marketName: market ? getMarketLabel(market) : undefined,
        marketId: market ? market.id : undefined,
        bulk,
        rekap,
        month: bulk ? undefined : month,
        year: bulk ? undefined : year,
        truncate,
      });

      alert(`Import berhasil.\nimported=${res?.imported ?? 0}, skipped=${res?.skipped ?? 0}`);
      // show unknown names if any
      if (Array.isArray(res?.unknown_names) && res.unknown_names.length > 0) {
        setUnknownNames(res.unknown_names);
      } else {
        setUnknownNames([]);
      }

      // reset form
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onDone?.(); // trigger refetch data tabel
    } catch (e: any) {
      alert(e?.message || 'Import gagal.');
    } finally {
      setBusy(false);
    }
  }

  async function addCommodity(name: string) {
    setCreating(true);
    try {
      await createCommodity(name);
      // remove from unknownNames
      setUnknownNames((prev) => prev.filter((n) => n !== name));
      alert(`Komoditas '${name}' berhasil ditambahkan.`);
    } catch (e: any) {
      alert((e as any)?.data?.message || (e as any)?.message || 'Gagal tambah komoditas');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      {/* File input */}
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={busy}
        />
        {file && <span className="text-sm text-gray-600">{file.name}</span>}
      </div>

      {/* Mode impor */}
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={bulk}
          onChange={(e) => setBulk(e.target.checked)}
          disabled={busy}
        />
        <span className="text-sm">
          Mode: {bulk ? 'Semua bulan (auto)' : 'Satu bulan (isi MM & YYYY)'}
        </span>
      </label>

      {/* Bulan & Tahun (muncul kalau bulk = false) */}
      {!bulk && (
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-2 py-1 w-16"
            placeholder="MM"
            value={month}
            onChange={(e) =>
              setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))
            }
            disabled={busy}
          />
          <input
            className="border rounded px-2 py-1 w-24"
            placeholder="YYYY"
            value={year}
            onChange={(e) =>
              setYear(e.target.value.replace(/\D/g, '').slice(0, 4))
            }
            disabled={busy}
          />
        </div>
      )}

      {/* Truncate */}
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={truncate}
          onChange={(e) => setTruncate(e.target.checked)}
          disabled={busy}
        />
        <span className="text-sm">Bersihkan data target sebelum impor</span>
      </label>

      {/* Rekap mode: biarkan upload workbook berisi beberapa sheet */}
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={rekap}
          onChange={(e) => setRekap(e.target.checked)}
          disabled={busy}
        />
        <span className="text-sm">Mode Rekap (deteksi pasar per-sheet)</span>
      </label>

      {/* Info pasar terpilih */}
      <div className="text-sm text-gray-700">
        Pasar terpilih:{' '}
        <span className="font-semibold">
          {selectedMarketId === 'all'
            ? '— (pilih satu pasar dulu)'
            : getMarketLabel(market)}
        </span>
      </div>

      {/* Tombol Import */}
      <button
        type="button"
        onClick={handleImport}
        disabled={busy || !file}
        className={`px-4 py-2 rounded text-white ${
          busy || !file ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {busy ? 'Mengunggah…' : 'Import Data'}
      </button>

      {/* Unknown names modal (simple) */}
      {unknownNames.length > 0 && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="font-medium mb-2">Nama Komoditas Tidak Dikenal</h3>
            <p className="text-sm text-gray-600 mb-3">Beberapa nama pada file tidak cocok dengan daftar komoditas. Tambahkan agar import berikutnya tidak di-skip.</p>
            <div className="max-h-48 overflow-auto mb-3">
              {unknownNames.map((n) => (
                <div key={n} className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm truncate">{n}</div>
                  <div>
                    <button onClick={() => addCommodity(n)} disabled={creating} className="px-2 py-1 bg-green-600 text-white rounded-md mr-2">Tambah</button>
                    <button onClick={() => setUnknownNames((prev) => prev.filter(x => x !== n))} className="px-2 py-1 border rounded-md">Abaikan</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setUnknownNames([]); }} className="px-3 py-2 border rounded">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
