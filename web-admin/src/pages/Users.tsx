'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usersService, type UserRow, type Role } from "../services/users.service";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Search, UserPlus, Edit, Trash2, Key, Shield, UserCheck, UserX,
  AlertCircle, Filter, Download, RefreshCw, Eye, Ban, Check, Users,
} from 'lucide-react';

// ▶️ Tambahan untuk avatar absolut + cache-busting
import { withUserAvatar, onAvatarBumped } from '@/lib/avatar';

type CreateUserForm = {
  nip?: string; username: string; name: string; phone: string; role: Role; email?: string; alamat?: string; password?: string;
};
type UserFilters = { search: string; role: Role | 'all'; status: 'all' | 'active' | 'inactive' };

// Peran saat ini untuk kontrol tombol (karena belum pakai auth FE)
const CURRENT_ROLE: Role = 'admin';

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState<UserFilters>({ search: '', role: 'all', status: 'all' });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [createForm, setCreateForm] = useState<CreateUserForm>({
    nip: '', username: '', name: '', phone: '', role: 'petugas', email: '', alamat: '', password: ''
  });
  const [editForm, setEditForm] = useState<Partial<UserRow>>({});

  // Reset Password (ADMIN-only)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ new_password: '', new_password_confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // 🔁 Tick khusus untuk memaksa re-render avatar saat ada event bump
  const [avatarTick, setAvatarTick] = useState(0);

  // LOAD
  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await usersService.list(); // default 'all'
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat data pengguna');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  // Dengarkan event "avatar:bumped" -> naikkan tick agar ?v= pada gambar berubah
  useEffect(() => {
    const off = onAvatarBumped(() => setAvatarTick(t => t + 1));
    return () => off();
  }, []);

  // UI helpers
  const getRoleBadgeColor = (role: Role) =>
    role === 'admin' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-green-100 text-green-800 border-green-200';

  const getRoleLabel = (role: Role) => (role === 'admin' ? 'Admin' : 'Petugas');

  const getStatusBadge = (isActive: number) =>
    isActive === 1 ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <UserCheck className="h-3 w-3 mr-1" /> Aktif
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        <UserX className="h-3 w-3 mr-1" /> Tidak Aktif
      </Badge>
    );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const filteredUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    const qraw = (filters.search ?? '').toString();
    const q = qraw.toLowerCase();

    return list.filter(u => {
      const name = (u.name ?? '').toLowerCase();
      const username = (u.username ?? '').toLowerCase();
      const nip = u.nip ?? '';
      const phone = u.phone ?? '';
      const matchesSearch = name.includes(q) || username.includes(q) || nip.includes(qraw) || phone.includes(qraw);
      const matchesRole = (filters.role === 'all') || (u.role === filters.role);
      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'active' && u.is_active === 1) ||
        (filters.status === 'inactive' && u.is_active === 0);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, filters]);

  const totalAll = users.length;
  const totalFiltered = filteredUsers.length;

  // Handlers
  const handleExportData = () => {
    const csv = [
      ['NIP','Nama','Username','No. HP','Role','Status','Tanggal Bergabung'],
      ...filteredUsers.map(u => [
        u.nip ?? '-', u.name, u.username, u.phone ?? '-', getRoleLabel(u.role),
        u.is_active ? 'Aktif' : 'Tidak Aktif', formatDate(u.created_at)
      ])
    ].map(r => r.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `data_pengguna_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setSuccess('Data berhasil diekspor'); setTimeout(()=>setSuccess(''),2000);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refresh();
      setSuccess('Data berhasil diperbarui');
      setTimeout(()=>setSuccess(''),1500);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!createForm.username || !createForm.name) { setFormError('Nama & username wajib diisi'); return; }
    const password = createForm.password?.trim() || 'password';

    setFormLoading(true);
    try {
      await usersService.create({
        nip: createForm.nip?.trim(),
        username: createForm.username.trim(),
        password,
        name: createForm.name.trim(),
        phone: createForm.phone,
        alamat: createForm.alamat,
        role: createForm.role,
      });
      setIsCreateDialogOpen(false);
      setCreateForm({ nip:'', username:'', name:'', phone:'', role:'petugas', email:'', alamat:'', password:'' });
      setSuccess('Pengguna berhasil ditambahkan'); setTimeout(()=>setSuccess(''),2000);
      await refresh();
    } catch (e:any) {
      setFormError(e?.message || 'Gagal menambah pengguna');
    } finally {
      setFormLoading(false);
    }
  };

  const openViewDialog = (u: UserRow) => { setSelectedUser(u); setIsViewDialogOpen(true); };
  const openEditDialog = (u: UserRow) => {
    setSelectedUser(u);
    setEditForm({ name: u.name, phone: u.phone ?? '', role: u.role, is_active: u.is_active, nip: u.nip ?? '' });
    setIsEditDialogOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedUser) return;
    if (!editForm.name) { setFormError('Nama wajib diisi'); return; }

    setFormLoading(true);
    try {
      await usersService.update(selectedUser.id, {
        name: String(editForm.name).trim(),
        phone: (editForm.phone ?? '') as string,
        role: editForm.role as Role,
        is_active: (editForm.is_active ?? 1) as 0 | 1,
        nip: (editForm.nip as string) ?? null,
      });
      setIsEditDialogOpen(false); setSelectedUser(null); setEditForm({});
      setSuccess('Data pengguna berhasil diperbarui'); setTimeout(()=>setSuccess(''),2000);
      await refresh();
    } catch (e:any) {
      setFormError(e?.message || 'Gagal memperbarui pengguna');
    } finally {
      setFormLoading(false);
    }
  };

  // Reset Password (ADMIN-only)
  function openChangePasswordDialogFor(u: UserRow) {
    setSelectedUser(u);
    setPwdForm({ new_password: '', new_password_confirm: '' });
    setPwdError('');
    setIsPasswordDialogOpen(true);
  }
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');
    if (!selectedUser) return;

    if (!pwdForm.new_password || !pwdForm.new_password_confirm) {
      setPwdError('Password baru & konfirmasi wajib diisi'); return;
    }
    if (pwdForm.new_password !== pwdForm.new_password_confirm) {
      setPwdError('Konfirmasi password baru tidak cocok'); return;
    }
    if (pwdForm.new_password.length < 6) {
      setPwdError('Password baru minimal 6 karakter'); return;
    }
    setPwdLoading(true);
    try {
      await usersService.resetPassword(selectedUser.id, pwdForm.new_password);
      setIsPasswordDialogOpen(false);
      setSuccess('Password berhasil direset'); setTimeout(()=>setSuccess(''), 2000);
    } catch (err:any) {
      setPwdError(err?.message || 'Gagal reset password');
    } finally {
      setPwdLoading(false);
    }
  }

  const handleToggleStatus = async (id: number) => {
    const u = users.find(x => x.id === id); if (!u) return;
    const to = u.is_active ? 0 : 1;
    if (!confirm(`Yakin ingin ${to ? 'mengaktifkan' : 'menonaktifkan'} "${u.name}"?`)) return;
    await usersService.update(id, { is_active: to as 0|1 });
    await refresh();
  };

  const handleDeleteUser = async (id: number) => {
    const u = users.find(x => x.id === id); if (!u) return;
    if (!confirm(`Hapus pengguna "${u.name}"?`)) return;
    await usersService.remove(id);
    await refresh();
  };

  const canManageUsers = CURRENT_ROLE === 'admin';
  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Akses Ditolak</h3>
          <p className="text-gray-600">Anda tidak memiliki akses untuk mengelola pengguna</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Petugas HARPA</h1>
          <p className="text-gray-600 mt-1">Manajemen pengguna sistem Harpa Banua</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportData} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={()=>setIsCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700 gap-2">
            <UserPlus className="h-4 w-4" /> Tambah Petugas
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari nama, username, NIP, atau no. HP..."
                  value={filters.search}
                  onChange={(e)=>setFilters(p=>({...p, search:e.target.value}))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filters.role} onValueChange={(v: any)=>setFilters(p=>({...p, role:v}))}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="petugas">Petugas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v: any)=>setFilters(p=>({...p, status:v}))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Daftar Petugas</CardTitle>
          <CardDescription>Menampilkan {totalFiltered} dari {totalAll} pengguna</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
                <p className="text-gray-600">Memuat data pengguna...</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Informasi Pengguna</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Bergabung</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => {
                    const init = (u.name || u.username || 'U').charAt(0).toUpperCase();
                    const avatar = withUserAvatar(u.id, (u as any).foto || null); // ← gunakan field foto bila ada
                    return (
                      <TableRow key={u.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {avatar ? (
                              <img
                                key={`${u.id}-${avatarTick}`}
                                src={avatar}
                                alt={u.name}
                                className="h-10 w-10 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-medium text-sm">
                                {init}
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-sm text-gray-500">@{u.username}</div>
                              <div className="text-xs text-gray-400">{u.nip ?? '-'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><div className="text-sm">{u.phone ?? '-'}</div></TableCell>
                        <TableCell><Badge className={getRoleBadgeColor(u.role)}>{getRoleLabel(u.role)}</Badge></TableCell>
                        <TableCell>{getStatusBadge(u.is_active)}</TableCell>
                        <TableCell><div className="text-sm">{formatDate(u.created_at)}</div></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={()=>openViewDialog(u)} className="h-8 w-8 p-0"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={()=>openEditDialog(u)} className="h-8 w-8 p-0"><Edit className="h-4 w-4" /></Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={()=>openChangePasswordDialogFor(u)}
                              className="h-8 w-8 p-0"
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={()=>handleToggleStatus(u.id)}
                              className={`h-8 w-8 p-0 ${u.is_active ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                            >
                              {u.is_active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={()=>handleDeleteUser(u.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-10">
                        Tidak ada data yang cocok.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(v) => { setFormError(''); setIsCreateDialogOpen(v); }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Tambah Pengguna</DialogTitle>
            <DialogDescription>Isi data petugas atau admin, lalu simpan. Kosongkan password untuk gunakan default server.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="crt-name">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input id="crt-name" value={createForm.name} onChange={(e)=>setCreateForm(p=>({...p, name:e.target.value}))} placeholder="Nama lengkap" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crt-username">Username <span className="text-red-500">*</span></Label>
                <Input id="crt-username" value={createForm.username} onChange={(e)=>setCreateForm(p=>({...p, username:e.target.value}))} placeholder="username unik" autoComplete="off" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crt-nip">NIP (opsional)</Label>
                <Input id="crt-nip" value={createForm.nip} onChange={(e)=>setCreateForm(p=>({...p, nip:e.target.value}))} placeholder="1990..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crt-phone">No. HP (opsional)</Label>
                <Input id="crt-phone" value={createForm.phone} onChange={(e)=>setCreateForm(p=>({...p, phone:e.target.value}))} placeholder="08..." />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="crt-alamat">Alamat (opsional)</Label>
                <Input id="crt-alamat" value={createForm.alamat} onChange={(e)=>setCreateForm(p=>({...p, alamat:e.target.value}))} placeholder="Alamat" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={createForm.role} onValueChange={(v: any)=>setCreateForm(p=>({...p, role: v as Role}))}>
                  <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petugas">Petugas</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="crt-password">Password awal (opsional)</Label>
                <Input id="crt-password" type="password" value={createForm.password} onChange={(e)=>setCreateForm(p=>({...p, password:e.target.value}))} placeholder="(kosongkan → default server)" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={()=>setIsCreateDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={formLoading} className="bg-green-600 hover:bg-green-700">
                {formLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" />
                    Menyimpan…
                  </span>
                ) : (
                  'Simpan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Detail Pengguna</DialogTitle>
            <DialogDescription>Informasi lengkap pengguna</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {withUserAvatar(selectedUser.id, (selectedUser as any).foto || null) ? (
                  <img
                    key={`view-${selectedUser.id}-${avatarTick}`}
                    src={withUserAvatar(selectedUser.id, (selectedUser as any).foto || null)!}
                    className="h-16 w-16 rounded-full object-cover border"
                    alt={selectedUser.name}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center text-white font-medium text-xl">
                    {String(selectedUser.name ?? '').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600">@{selectedUser.username}</p>
                  <Badge className={getRoleBadgeColor(selectedUser.role)}>{getRoleLabel(selectedUser.role)}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">NIP</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedUser.nip ?? '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">No. HP</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedUser.phone ?? '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Role</Label>
                  <Badge className={getRoleBadgeColor(selectedUser.role)}>{getRoleLabel(selectedUser.role)}</Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  {getStatusBadge(selectedUser.is_active)}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tanggal Bergabung</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">{formatDate(selectedUser.created_at)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Edit Pengguna</DialogTitle>
            <DialogDescription>Perbarui informasi pengguna</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nama Lengkap <span className="text-red-500">*</span></Label>
                  <Input id="edit-name" value={String(editForm.name ?? '')} onChange={(e)=>setEditForm(p=>({...p, name:e.target.value}))} placeholder="Masukkan nama lengkap" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">No. HP</Label>
                  <Input id="edit-phone" value={String(editForm.phone ?? '')} onChange={(e)=>setEditForm(p=>({...p, phone:e.target.value}))} placeholder="Masukkan nomor HP" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={(editForm.role as Role) ?? ''} onValueChange={(v: Role)=>setEditForm(p=>({...p, role:v}))}>
                    <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petugas">Petugas</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.is_active !== undefined ? String(editForm.is_active) : ''} onValueChange={(v)=>setEditForm(p=>({...p, is_active: parseInt(v) as 0|1}))}>
                    <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Aktif</SelectItem>
                      <SelectItem value="0">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nip">NIP</Label>
                <Input id="edit-nip" value={String(editForm.nip ?? '')} onChange={(e)=>setEditForm(p=>({...p, nip:e.target.value}))} placeholder="Opsional, disarankan unik" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" />
                    Memproses...
                  </span>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> Reset Password Pengguna
            </DialogTitle>
            <DialogDescription>Admin menetapkan password baru tanpa membutuhkan password lama.</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="mb-2 rounded-md bg-gray-50 p-3 text-sm">
              <div><span className="font-medium">Nama:</span> {selectedUser.name}</div>
              <div><span className="font-medium">Username:</span> @{selectedUser.username}</div>
              <div><span className="font-medium">NIP:</span> {selectedUser.nip ?? '-'}</div>
              <div><span className="font-medium">Role:</span> {getRoleLabel(selectedUser.role)}</div>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            {pwdError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{pwdError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pwd-new">Password Baru</Label>
                <Input id="pwd-new" type="password" value={pwdForm.new_password} onChange={(e)=>setPwdForm(p=>({...p, new_password:e.target.value}))} placeholder="Min. 6 karakter" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-confirm">Konfirmasi Password Baru</Label>
                <Input id="pwd-confirm" type="password" value={pwdForm.new_password_confirm} onChange={(e)=>setPwdForm(p=>({...p, new_password_confirm:e.target.value}))} placeholder="Ulangi password baru" required />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pwdLoading}>
                {pwdLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" />
                    Memproses...
                  </span>
                ) : (
                  'Simpan Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
