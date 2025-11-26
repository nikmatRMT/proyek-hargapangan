export const API_BASE =
  (import.meta.env.VITE_API_URL || 'https://harpa-banua.vercel.app').replace(/\/$/, '');

export function absUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
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
