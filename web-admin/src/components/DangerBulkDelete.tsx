
import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../api';

interface Props {
    selectedMarketId: number | string | "all";
    onDone: () => void;
}

export function DangerBulkDelete({ selectedMarketId, onDone }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

    async function handleDelete() {
        if (!month) return;
        if (selectedMarketId === 'all') {
            if (!confirm(`PERINGATAN: Anda akan menghapus SEMUA data dari SEMUA pasar pada bulan ${month}. Lanjutkan?`)) return;
        } else {
            if (!confirm(`Anda akan menghapus data pada bulan ${month} untuk pasar ini. Lanjutkan?`)) return;
        }

        try {
            setLoading(true);
            setError(null);
            // Calls API to delete range
            // Assuming endpoint DELETE /api/reports/bulk?month=YYYY-MM&market_id=...
            const url = new URL(`${API_BASE}/reports/bulk`);
            url.searchParams.set('month', month);
            if (selectedMarketId !== 'all') {
                url.searchParams.set('market_id', String(selectedMarketId));
            }

            const res = await fetch(url.toString(), {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!res.ok) {
                throw new Error('Gagal menghapus data');
            }

            const data = await res.json();
            alert(`Berhasil menghapus ${data.deletedCount || 'beberapa'} data.`);
            onDone();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 p-4 rounded-lg border border-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                    <p className="font-semibold">Hapus Data Bulanan</p>
                    <p>Fitur ini akan menghapus laporan harga secara massal berdasarkan bulan yang dipilih.
                        Tindakan ini <strong>tidak dapat dibatalkan</strong>.</p>
                </div>
            </div>

            <div className="flex items-end gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Pilih Bulan</label>
                    <input
                        type="month"
                        value={month}
                        onChange={e => setMonth(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                    />
                </div>

                <button
                    onClick={handleDelete}
                    disabled={loading || !month}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Menghapus...' : (
                        <>
                            <Trash2 className="h-4 w-4" />
                            Hapus Data
                        </>
                    )}
                </button>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
