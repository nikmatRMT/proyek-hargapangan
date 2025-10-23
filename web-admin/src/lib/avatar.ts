
type Key = 'me' | `user:${number}`;

const g = globalThis as any;
g.__avatarVerMap = g.__avatarVerMap || new Map<Key, number>();
const verMap: Map<Key, number> = g.__avatarVerMap;

export const API_BASE =
  ((import.meta as any)?.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://harpa-banua.vercel.app';

function ensureAbs(u?: string | null) {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}${u.startsWith('/') ? u : '/' + u}`;
}

function withV(src?: string | null, key?: Key) {
  const abs = ensureAbs(src);
  if (!abs) return undefined;
  const v = key ? (verMap.get(key) ?? 0) : 0;
  const sep = abs.includes('?') ? '&' : '?';
  return `${abs}${sep}v=${v}`;
}

export function withMeAvatar(src?: string | null) {
  return withV(src, 'me');
}
export function withUserAvatar(userId: number, src?: string | null) {
  return withV(src, `user:${userId}`);
}

export type AvatarBumpDetail = { key: Key; v: number; id?: number };
function dispatchBump(detail: AvatarBumpDetail) {
  window.dispatchEvent(new CustomEvent<AvatarBumpDetail>('avatar:bumped', { detail }));
}

export function bumpMe() {
  const key: Key = 'me';
  verMap.set(key, (verMap.get(key) ?? 0) + 1);

  let me: any = null;
  try { me = JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch {}
  if (me?.id) {
    const uKey: Key = `user:${me.id}`;
    verMap.set(uKey, (verMap.get(uKey) ?? 0) + 1);
    dispatchBump({ key: uKey, v: verMap.get(uKey)!, id: me.id });
  }

  dispatchBump({ key, v: verMap.get(key)!, id: me?.id });
}

export function bumpUser(userId: number) {
  const key: Key = `user:${userId}`;
  verMap.set(key, (verMap.get(key) ?? 0) + 1);
  dispatchBump({ key, v: verMap.get(key)!, id: userId });
}

export function onAvatarBumped(cb: (info: AvatarBumpDetail) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<AvatarBumpDetail>).detail);
  window.addEventListener('avatar:bumped', handler as EventListener);
  return () => window.removeEventListener('avatar:bumped', handler as EventListener);
}
