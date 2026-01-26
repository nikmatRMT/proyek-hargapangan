'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter, Download, FileSpreadsheet, FileText, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGetSurveyHistory, get, API_BASE } from '@/api';

type SurveyRow = {
    key: string;
    market_name: string;
    user_name: string;
    tanggal_lapor: string;
    totalItems: number;
    lastInputAt: string;
};

type UserOption = {
    id: number;
    name: string;
    username: string;
};

export default function SurveyHistory() {
    const [data, setData] = useState<SurveyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Filters
    const [filters, setFilters] = useState({
        from: '',
        to: '',
        userId: 'all'
    });

    const [users, setUsers] = useState<UserOption[]>([]);

    // Load Users for Filter
    useEffect(() => {
        (async () => {
            try {
                const res = await get('/api/users?role=all'); // fetch all roles
                const list = Array.isArray((res as any).data) ? (res as any).data : [];
                setUsers(list.map((u: any) => ({
                    id: u.id,
                    name: u.nama_lengkap || u.name,
                    username: u.username
                })));
            } catch (e) {
                console.error('Failed to load users', e);
            }
        })();
    }, []);

    // Load History Data
    async function loadData() {
        setLoading(true);
        try {
            const res = await apiGetSurveyHistory({
                from: filters.from,
                to: filters.to,
                userId: filters.userId,
                page,
                pageSize
            });
            if (res.ok && res.data) {
                setData(res.data.rows || []);
                setTotal(res.data.total || 0);
            }
        } catch (e) {
            console.error('Failed to load history', e);
        } finally {
            setLoading(false);
        }
    }

    // Effect to load data on dependencies change
    useEffect(() => {
        loadData();
    }, [page, filters.userId, filters.from, filters.to]); // Auto-refresh filters change

    const totalPages = Math.ceil(total / pageSize);

    // Helper for export URLs
    const getExportUrl = (type: 'pdf' | 'excel') => {
        const params = new URLSearchParams();
        if (filters.from) params.append('from', filters.from);
        if (filters.to) params.append('to', filters.to);
        if (filters.userId && filters.userId !== 'all') params.append('userId', filters.userId);
        return `${API_BASE}/api/survey-history/export/${type}?${params.toString()}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Riwayat Survey Petugas</h1>
                    <p className="text-gray-600 mt-1">Laporan aktivitas input harga petugas di lapangan</p>
                </div>
                <div className="flex items-center gap-2">
                    <a href={getExportUrl('pdf')} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="gap-2 text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200">
                            <FileText className="h-4 w-4" /> PDF
                        </Button>
                    </a>
                    <a href={getExportUrl('excel')} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="gap-2 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200">
                            <FileSpreadsheet className="h-4 w-4" /> Excel
                        </Button>
                    </a>
                    <Button onClick={loadData} variant="outline" size="icon" title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filter Data</CardTitle>
                    <CardDescription>Saring data berdasarkan tanggal atau nama petugas</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        {/* Filter Tanggal */}
                        <div className="flex items-center gap-2">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Dari Tanggal</label>
                                <Input
                                    type="date"
                                    value={filters.from}
                                    onChange={e => setFilters(p => ({ ...p, from: e.target.value }))}
                                    className="w-[150px]"
                                />
                            </div>
                            <span className="mb-2 text-gray-400">–</span>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Sampai Tanggal</label>
                                <Input
                                    type="date"
                                    value={filters.to}
                                    onChange={e => setFilters(p => ({ ...p, to: e.target.value }))}
                                    className="w-[150px]"
                                />
                            </div>
                        </div>

                        {/* Filter Petugas */}
                        <div className="space-y-1 flex-1 min-w-[200px]">
                            <label className="text-sm font-medium text-gray-700">Nama Petugas</label>
                            <Select
                                value={filters.userId}
                                onValueChange={v => setFilters(p => ({ ...p, userId: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Petugas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Petugas</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name} (@{u.username})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={() => {
                                setFilters({ from: '', to: '', userId: 'all' });
                                setPage(1);
                            }}
                            className="mb-0.5 text-gray-500"
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] text-center">No</TableHead>
                                <TableHead className="w-[150px]">Tanggal Lapor</TableHead>
                                <TableHead>Nama Petugas</TableHead>
                                <TableHead>Lokasi Pasar</TableHead>
                                <TableHead className="text-center w-[120px]">Jml Komoditas</TableHead>
                                <TableHead className="w-[180px]">Waktu Input Terakhir</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                        Memuat data...
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                        Tidak ada data survey ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row, i) => (
                                    <TableRow key={row.key + i} className="hover:bg-gray-50">
                                        <TableCell className="text-center">
                                            {(page - 1) * pageSize + i + 1}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(row.tanggal_lapor).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {row.user_name}
                                        </TableCell>
                                        <TableCell>
                                            {row.market_name}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {row.totalItems} Item
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {row.lastInputAt
                                                ? new Date(row.lastInputAt).toLocaleString('id-ID', {
                                                    weekday: 'short', hour: '2-digit', minute: '2-digit'
                                                })
                                                : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Pagination */}
                {total > 0 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t">
                        <div className="text-sm text-gray-500">
                            Menampilkan <b>{(page - 1) * pageSize + 1}</b> - <b>{Math.min(page * pageSize, total)}</b> dari <b>{total}</b>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm font-medium min-w-[30px] text-center">
                                {page} / {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
