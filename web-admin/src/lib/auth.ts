// src/lib/auth.ts
export type AuthUser = any;

export function readAuthUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); }
  catch { return null; }
}

export function writeAuthUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem('auth_user', JSON.stringify(user));
    else localStorage.removeItem('auth_user');
  } catch {}
  // beri tahu seluruh app kalau auth berubah
  window.dispatchEvent(new CustomEvent('auth:changed'));
}

/** Gabungkan patch ke auth_user yang ada, lalu persist + broadcast */
export function mergeAuthUser(patch: Partial<AuthUser>) {
  const now = readAuthUser() || {};
  writeAuthUser({ ...now, ...patch });
}
