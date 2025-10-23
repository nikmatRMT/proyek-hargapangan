import { API_BASE } from '@/api';

const API = API_BASE;

function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API}${p}`;
}

async function http<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(abs(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
  return json as T;
}

export type ProfileUser = {
  id: number;
  nip: string | null;
  nama_lengkap: string;
  username: string;
  role: 'admin' | 'petugas' | 'super_admin';
  is_active: 0 | 1;
  phone: string | null;
  alamat: string | null;
  foto?: string | null;
  created_at: string;
  updated_at: string;
};

export const ProfileApi = {
  me: () => http<{ user: ProfileUser }>(`/api/me`),
  update: (patch: Partial<Pick<ProfileUser, 'nama_lengkap' | 'phone' | 'alamat' | 'foto'>>) =>
    http<{ user: ProfileUser }>(`/api/me`, { method: 'PATCH', body: JSON.stringify(patch) }),
};
