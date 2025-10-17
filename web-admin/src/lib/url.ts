// src/lib/url.ts
export const API_BASE =
  (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export function absUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;          // sudah absolut
  const p = path.startsWith('/') ? path : `/${path}`;   // pastikan 1 slash di depan
  return `${API_BASE}${p}`;
}

export function cachebust(u?: string, ver?: string | number | Date) {
  if (!u) return '';
  const v =
    ver instanceof Date ? ver.getTime()
    : typeof ver === 'number' ? ver
    : ver ? Date.parse(ver) || Date.now()
    : Date.now();
  return u + (u.includes('?') ? '&' : '?') + 'v=' + v;
}
