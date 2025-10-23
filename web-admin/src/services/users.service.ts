'use client';

import { API_BASE } from '@/api';

export type Role = 'admin' | 'petugas';
export type UserRow = {
  id: number;
  nip: string | null;
  name: string;                // map dari nama_lengkap
  username: string;
  role: Role;
  is_active: 0 | 1;
  phone: string | null;
  alamat: string | null;
  foto?: string | null;
  created_at: string;
  updated_at: string;
};

const API = API_BASE;

function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API}${p}`;
}

async function http(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(abs(path), {
    credentials: 'include',
    cache: 'no-store',                               // ⬅️ cegah 304
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate', // ⬅️ cegah cache
      Pragma: 'no-cache',
      Expires: '0',
      ...(init?.headers || {}),
    },
    ...init,
  });

  // Bila 204/304, tidak ada body. Balikkan objek kosong agar aman.
  if (res.status === 204 || res.status === 304) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return {};
  }

  const text = await res.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch {}

  if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
  return body;
}

function toFrontRow(row: any): UserRow {
  return {
    id: row.id,
    nip: row.nip ?? null,
    name: row.nama_lengkap ?? row.name ?? '',
    username: row.username,
    role: (row.role === 'admin' ? 'admin' : 'petugas'),
    is_active: Number(row.is_active) ? 1 : 0,
    phone: row.phone ?? null,
    alamat: row.alamat ?? null,
    foto: row.foto ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const usersService = {
  // DEFAULT: 'all' supaya tidak kosong kalau baru ada akun admin saja
  async list(params?: { role?: 'all' | 'admin' | 'petugas' }): Promise<UserRow[]> {
    const role = params?.role ?? 'all';              // ⬅️ default all
    const q = role ? `?role=${role}` : '';
    const body = await http(`/api/users${q}`);
    const arr = Array.isArray(body) ? body : body?.data;
    return Array.isArray(arr) ? arr.map(toFrontRow) : [];
  },

  async create(payload: {
    username: string;
    name: string;
    nip: string;                // WAJIB - 18 digit
    phone?: string | null;
    alamat?: string | null;
    role?: Role;               // default petugas
    password?: string;         // optional
  }): Promise<UserRow> {
    // Normalize: empty string → null (kecuali NIP yang wajib)
    const normalizeOptional = (val: any) => (val && String(val).trim()) ? String(val).trim() : null;
    
    const body = await http(`/api/users`, {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username,
        nama_lengkap: payload.name,
        nip: payload.nip, // NIP wajib, tidak di-normalize
        phone: normalizeOptional(payload.phone),
        alamat: normalizeOptional(payload.alamat),
        role: payload.role ?? 'petugas',
        password: payload.password,
        is_active: 1,
      }),
    });
    return toFrontRow(body?.data ?? body);
  },

  async update(
    id: number,
    patch: Partial<{
      name: string;
      phone: string | null;
      alamat: string | null;
      role: Role;
      is_active: 0 | 1 | boolean;
      nip: string;              // WAJIB - 18 digit
    }>
  ): Promise<UserRow> {
    // Normalize: empty string → null (kecuali NIP yang wajib)
    const normalizeOptional = (val: any) => (val && String(val).trim()) ? String(val).trim() : null;
    
    const p: any = { ...patch };
    if ('name' in p) { p.nama_lengkap = p.name; delete p.name; }
    if ('is_active' in p) p.is_active = Number(p.is_active ? 1 : 0);
    
    // Normalize optional fields (NIP tidak di-normalize karena wajib)
    if ('phone' in p) p.phone = normalizeOptional(p.phone);
    if ('alamat' in p) p.alamat = normalizeOptional(p.alamat);
    // NIP tetap as-is karena sudah divalidasi di frontend
    
    const body = await http(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(p) });
    return toFrontRow(body?.data ?? body);
  },

  async resetPassword(id: number, newPassword?: string): Promise<void> {
    const payload: any = newPassword ? { new_password: newPassword } : {};
    await http(`/api/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify(payload) });
  },

  async remove(id: number): Promise<void> {
    await http(`/api/users/${id}`, { method: 'DELETE' });
  },
};
