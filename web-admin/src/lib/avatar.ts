// src/lib/avatar.ts
// Util avatar: buat URL absolut ke API + cache-busting, plus event agar
// komponen lain bisa re-render saat foto diganti.

type Key = 'me' | `user:${number}`;

// Simpan versi global di window agar konsisten walau komponen re-render/HMR
const g = globalThis as any;
g.__avatarVerMap = g.__avatarVerMap || new Map<Key, number>();
const verMap: Map<Key, number> = g.__avatarVerMap;

// Base URL API (ambil dari Vite env, fallback ke localhost)
export const API_BASE =
  ((import.meta as any)?.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:4000';

// Jadikan path relatif → absolut ke API
function ensureAbs(u?: string | null) {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;                 // sudah absolut
  return `${API_BASE}${u.startsWith('/') ? u : '/' + u}`; // /uploads/...
}

// Tambahkan query ?v= untuk bust cache
function withV(src?: string | null, key?: Key) {
  const abs = ensureAbs(src);
  if (!abs) return undefined;
  const v = key ? (verMap.get(key) ?? 0) : 0;
  const sep = abs.includes('?') ? '&' : '?';
  return `${abs}${sep}v=${v}`;
}

// === PUBLIC: bikin URL avatar ===
export function withMeAvatar(src?: string | null) {
  return withV(src, 'me');
}
export function withUserAvatar(userId: number, src?: string | null) {
  return withV(src, `user:${userId}`);
}

// === Event system untuk memberi tahu komponen lain ===
export type AvatarBumpDetail = { key: Key; v: number; id?: number };
function dispatchBump(detail: AvatarBumpDetail) {
  window.dispatchEvent(new CustomEvent<AvatarBumpDetail>('avatar:bumped', { detail }));
}

// Naikkan versi avatar akun login (dipanggil setelah upload foto diri)
export function bumpMe() {
  const key: Key = 'me';
  verMap.set(key, (verMap.get(key) ?? 0) + 1);

  // Jika tahu id user login dari localStorage, mirror juga versi user:<id>
  let me: any = null;
  try { me = JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch {}
  if (me?.id) {
    const uKey: Key = `user:${me.id}`;
    verMap.set(uKey, (verMap.get(uKey) ?? 0) + 1);
    dispatchBump({ key: uKey, v: verMap.get(uKey)!, id: me.id });
  }

  dispatchBump({ key, v: verMap.get(key)!, id: me?.id });
}

// Naikkan versi avatar user tertentu (mis. admin ubah foto user lain)
export function bumpUser(userId: number) {
  const key: Key = `user:${userId}`;
  verMap.set(key, (verMap.get(key) ?? 0) + 1);
  dispatchBump({ key, v: verMap.get(key)!, id: userId });
}

// Daftarkan listener perubahan avatar.
// Return: fungsi untuk unsubscribe.
export function onAvatarBumped(cb: (info: AvatarBumpDetail) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<AvatarBumpDetail>).detail);
  window.addEventListener('avatar:bumped', handler as EventListener);
  return () => window.removeEventListener('avatar:bumped', handler as EventListener);
}
