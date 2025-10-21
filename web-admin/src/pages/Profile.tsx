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
import { User, Mail, Phone, Shield, Calendar, MapPin, Edit, Check, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  nip?: string | null; // Nomor Induk Pegawai
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
  const [edit, setEdit] = useState<{ nama_lengkap: string; phone: string; alamat: string; nip: string }>({
    nama_lengkap: '', phone: '', alamat: '', nip: '',
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
          nip: u.nip || '',
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
        nip: edit.nip,
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Alerts */}
      {!!ok && (
        <Alert className="border-green-200 bg-green-50 shadow-sm">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{ok}</AlertDescription>
        </Alert>
      )}
      {!!err && (
        <Alert variant="destructive" className="shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profil Saya</h1>
          <p className="text-base text-gray-600 mt-2">Informasi akun dan data pribadi</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
          <Button 
            variant="outline" 
            className="flex items-center gap-2 h-10 px-4" 
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Ganti Foto</span>
            <span className="sm:hidden">Foto</span>
          </Button>
        </div>
      </div>

      {/* Profile Overview */}
      <Card className="border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
        <CardContent className="p-8">
          {/* responsive grid: mobile=stack, desktop=2 columns */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* avatar */}
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 mx-auto sm:mx-0">
              <div className="absolute inset-0 rounded-full bg-white/70 ring-1 ring-blue-200" />
              <Avatar className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-white shadow-lg overflow-hidden">
                <AvatarImage
                  src={meAvatarUrl || ""}
                  alt={user.nama_lengkap}
                  className="h-full w-full object-cover"
                />
                <AvatarFallback className="h-full w-full rounded-full grid place-items-center text-2xl font-semibold bg-blue-600 text-white">
                  {user.nama_lengkap.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* konten kanan */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{user.nama_lengkap}</h2>
                <Badge className={`${roleBadge(user.role)} text-sm`}>{roleLabel(user.role)}</Badge>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-3">
                <p className="text-lg text-gray-600">@{user.username}</p>
                {user.is_active ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">✓ Aktif</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 border-red-200">✗ Non-aktif</Badge>
                )}
              </div>
              <p className="text-base text-gray-500">
                📅 Bergabung sejak {fmtDate(user.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Information (read-only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <User className="h-6 w-6" />
              Informasi Pribadi
            </CardTitle>
            <CardDescription className="text-base">Data identitas diri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">NIP</p>
                  <p className="text-sm text-gray-500">Nomor Induk Pegawai</p>
                </div>
              </div>
              <span className="text-base font-mono text-gray-900">{user.nip || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Nama Lengkap</p>
                  <p className="text-sm text-gray-500">Nama sesuai identitas</p>
                </div>
              </div>
              <span className="text-base text-gray-900 text-right max-w-48 truncate">{user.nama_lengkap}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <Mail className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Username</p>
                  <p className="text-sm text-gray-500">Nama pengguna sistem</p>
                </div>
              </div>
              <span className="text-base text-gray-900">@{user.username}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <Phone className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Telepon</p>
                  <p className="text-sm text-gray-500">Nomor kontak</p>
                </div>
              </div>
              <span className="text-base text-gray-900">{user.phone || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Shield className="h-6 w-6" />
              Informasi Akun
            </CardTitle>
            <CardDescription className="text-base">Data akun sistem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Peran</p>
                  <p className="text-sm text-gray-500">Hak akses sistem</p>
                </div>
              </div>
              <Badge className={`${roleBadge(user.role)} text-sm`}>{roleLabel(user.role)}</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Status Akun</p>
                  <p className="text-sm text-gray-500">Kondisi akun saat ini</p>
                </div>
              </div>
              {user.is_active ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-sm">✓ Aktif</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-200 text-sm">✗ Non-aktif</Badge>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Tanggal Bergabung</p>
                  <p className="text-sm text-gray-500">Waktu pendaftaran akun</p>
                </div>
              </div>
              <span className="text-base text-gray-900 text-right max-w-40 truncate">{fmtDate(user.created_at)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center">
                  <MapPin className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">Lokasi</p>
                  <p className="text-sm text-gray-500">Area kerja</p>
                </div>
              </div>
              <span className="text-base text-gray-900">DKP3 Banjarbaru</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit form */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Edit Profil</CardTitle>
          <CardDescription className="text-base">Perbarui nama, telepon, alamat, dan NIP.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-medium">Nama Lengkap</Label>
                <Input 
                  value={edit.nama_lengkap} 
                  onChange={e => setEdit(v => ({ ...v, nama_lengkap: e.target.value }))}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Username</Label>
                <Input 
                  value={user.username} 
                  disabled 
                  className="h-12 text-base bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">No. HP</Label>
                <Input 
                  value={edit.phone} 
                  onChange={e => setEdit(v => ({ ...v, phone: e.target.value }))}
                  className="h-12 text-base"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">NIP</Label>
                <Input 
                  value={edit.nip || ''} 
                  onChange={e => setEdit(v => ({ ...v, nip: e.target.value }))}
                  className="h-12 text-base font-mono"
                  placeholder="18 digit NIP"
                  maxLength={18}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Alamat</Label>
              <Input 
                value={edit.alamat} 
                onChange={e => setEdit(v => ({ ...v, alamat: e.target.value }))}
                className="h-12 text-base"
                placeholder="Alamat lengkap"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                📸 Format foto: PNG/JPG/WebP, maksimal 3MB<br/>
                📱 NIP harus 18 digit angka
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="h-12 px-8 bg-green-600 hover:bg-green-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan…
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
