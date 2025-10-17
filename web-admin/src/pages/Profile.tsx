// src/pages/Profile.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Phone, Shield, Calendar, MapPin, Edit, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { apiMe, apiUpdateMe, apiUploadAvatar } from '@/api';
import { withMeAvatar, bumpMe } from '@/lib/avatar';

type Role = 'super_admin' | 'admin' | 'petugas';

type ProfileUser = {
  id: number;
  username: string;
  nama_lengkap: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  phone?: string | null;
  alamat?: string | null;
  foto?: string | null; // contoh: "/uploads/avatar/u1-xxx.webp"
};

const roleBadge = (role: string) =>
  role === 'super_admin'
    ? 'bg-red-100 text-red-800 border-red-200'
    : role === 'admin'
    ? 'bg-blue-100 text-blue-800 border-blue-200'
    : 'bg-green-100 text-green-800 border-green-200';

const roleLabel = (r: string) => (r === 'super_admin' ? 'Super Admin' : r === 'admin' ? 'Admin' : 'Petugas');

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [edit, setEdit] = useState<{ nama_lengkap: string; phone: string; alamat: string }>({
    nama_lengkap: '', phone: '', alamat: '',
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiMe(); // { user }
        const u = (res as any).user as ProfileUser;
        setUser(u);
        setEdit({
          nama_lengkap: u.nama_lengkap,
          phone: u.phone || '',
          alamat: u.alamat || '',
        });
      } catch (e: any) {
        setErr(e.message || 'Gagal memuat profil');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setErr(''); setOk('');
    try {
      const res = await apiUpdateMe({
        nama_lengkap: edit.nama_lengkap,
        phone: edit.phone,
        alamat: edit.alamat,
      }); // { user: updated }
      const updated = (res as any).user as ProfileUser;
      setUser(updated);

      // sinkron localStorage untuk akun yang login
      try {
        const au = JSON.parse(localStorage.getItem('auth_user') || 'null');
        if (au?.id === updated.id) {
          localStorage.setItem('auth_user', JSON.stringify({ ...au, nama_lengkap: updated.nama_lengkap }));
        }
      } catch {}

      setOk('Profil disimpan'); setTimeout(() => setOk(''), 1500);
    } catch (e: any) {
      setErr(e.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  }

  // Upload avatar akun yang sedang login
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !user) return;

    setErr(''); setOk('');
    try {
      const res = await apiUploadAvatar(f); // { foto } atau { user: {..., foto} }
      const newFoto: string | undefined = (res as any)?.user?.foto ?? (res as any)?.foto;

      if (newFoto) {
        const updated = { ...user, foto: newFoto };
        setUser(updated);

        // sinkron localStorage utk akun yg sedang login
        try {
          const au = JSON.parse(localStorage.getItem('auth_user') || 'null');
          if (au?.id === updated.id) {
            localStorage.setItem('auth_user', JSON.stringify({ ...au, foto: newFoto }));
            bumpMe(); // ← cache-bust avatar "me" di seluruh app
          }
        } catch {}

        setOk('Foto profil diperbarui');
        setTimeout(() => setOk(''), 1500);
      } else {
        setOk('Foto terunggah');
      }
    } catch (e: any) {
      setErr(e.message || 'Gagal mengunggah foto');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Data tidak ditemukan</h3>
        <p className="text-gray-500">Terjadi kesalahan saat memuat data profil</p>
      </div>
    );
  }

  const meAvatarUrl = withMeAvatar(user.foto || null);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {!!ok && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{ok}</AlertDescription>
        </Alert>
      )}
      {!!err && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
          <p className="text-sm text-gray-600 mt-1">Informasi akun dan data pribadi</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
          <Button variant="outline" className="flex items-center gap-2" onClick={() => fileRef.current?.click()}>
            <ImageIcon className="h-4 w-4" />
            <span>Ganti Foto</span>
          </Button>
        </div>
      </div>

      {/* Profile Overview */}
      <Card className="border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-5">
          {/* grid 2 kolom: avatar (auto) + konten (1fr); items-center = tengah vertikal */}
          <div className="grid grid-cols-[88px_1fr] items-center gap-5 min-h-[96px]">
            {/* avatar kiri, ukuran tetap, tidak menyusut */}
            <div className="relative h-20 w-20 shrink-0">
              <div className="absolute inset-0 rounded-full bg-white/70 ring-1 ring-blue-200" />
              <Avatar className="relative h-20 w-20 rounded-full ring-2 ring-white shadow-sm overflow-hidden">
                <AvatarImage
                  src={meAvatarUrl || ""}
                  alt={user.nama_lengkap}
                  className="h-full w-full object-cover"
                />
                <AvatarFallback className="h-full w-full rounded-full grid place-items-center text-xl font-semibold bg-blue-600 text-white">
                  {user.nama_lengkap.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* konten kanan */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900 truncate">{user.nama_lengkap}</h2>
                <Badge className={roleBadge(user.role)}>{roleLabel(user.role)}</Badge>
                {user.is_active ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">Aktif</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 border-red-200">Non-aktif</Badge>
                )}
              </div>
              <p className="text-gray-600 mb-0.5">@{user.username}</p>
              <p className="text-sm text-gray-500 truncate">
                Bergabung sejak {fmtDate(user.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Information (read-only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informasi Pribadi
            </CardTitle>
            <CardDescription>Data identitas diri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">NIP</p>
                  <p className="text-sm text-gray-500">Nomor Induk Pegawai</p>
                </div>
              </div>
              <span className="text-sm font-mono text-gray-900">{/* Kosong di data contoh */}-</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Nama Lengkap</p>
                  <p className="text-sm text-gray-500">Nama sesuai identitas</p>
                </div>
              </div>
              <span className="text-sm text-gray-900">{user.nama_lengkap}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center">
                  <Mail className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Username</p>
                  <p className="text-sm text-gray-500">Nama pengguna sistem</p>
                </div>
              </div>
              <span className="text-sm text-gray-900">{user.username}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center">
                  <Phone className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Telepon</p>
                  <p className="text-sm text-gray-500">Nomor kontak</p>
                </div>
              </div>
              <span className="text-sm text-gray-900">{user.phone || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Informasi Akun
            </CardTitle>
            <CardDescription>Data akun sistem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center">
                  <Shield className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Peran</p>
                  <p className="text-sm text-gray-500">Hak akses sistem</p>
                </div>
              </div>
              <Badge className={roleBadge(user.role)}>{roleLabel(user.role)}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Status Akun</p>
                  <p className="text-sm text-gray-500">Kondisi akun saat ini</p>
                </div>
              </div>
              {user.is_active ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">Aktif</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-200">Non-aktif</Badge>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Tanggal Bergabung</p>
                  <p className="text-sm text-gray-500">Waktu pendaftaran akun</p>
                </div>
              </div>
              <span className="text-sm text-gray-900">{fmtDate(user.created_at)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center">
                  <MapPin className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Lokasi</p>
                  <p className="text-sm text-gray-500">Area kerja</p>
                </div>
              </div>
              <span className="text-sm text-gray-900">DKP3 Banjarbaru</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profil</CardTitle>
          <CardDescription>Perbarui nama, telepon, dan alamat.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nama Lengkap</Label>
                <Input value={edit.nama_lengkap} onChange={e => setEdit(v => ({ ...v, nama_lengkap: e.target.value }))} />
              </div>
              <div>
                <Label>Username</Label>
                <Input value={user.username} disabled />
              </div>
              <div>
                <Label>No. HP</Label>
                <Input value={edit.phone} onChange={e => setEdit(v => ({ ...v, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Alamat</Label>
              <Input value={edit.alamat} onChange={e => setEdit(v => ({ ...v, alamat: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Format foto: PNG/JPG/WebP, maks 3MB
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
