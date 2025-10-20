// services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// =====================
// Konfigurasi dasar
// =====================
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

function ensureApiUrl() {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL belum di-set.');
  if (!/^https?:\/\//i.test(API_URL)) {
    throw new Error(`EXPO_PUBLIC_API_URL tidak valid: "${API_URL}" (harus diawali http/https)`);
  }
}

function buildUrl(path) {
  ensureApiUrl();
  const base = API_URL.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function parseJsonResponse(res) {
  const text = await res.text();
  const ct = (res.headers.get('content-type') || '').toLowerCase();

  if (!ct.includes('application/json')) {
    const preview = (text || '').slice(0, 200);
    throw new Error(`Respon bukan JSON (HTTP ${res.status}). Body: ${preview}`);
  }
  let data = {};
  try { data = text ? JSON.parse(text) : {}; }
  catch { throw new Error('Server mengirim JSON tidak valid.'); }

  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

async function getToken() {
  return AsyncStorage.getItem('token');
}
export async function getStoredUser() {
  const raw = await AsyncStorage.getItem('user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function setStoredUser(user) {
  await AsyncStorage.setItem('user', JSON.stringify(user || null));
}

// =====================
// HTTP helpers
// =====================
async function http(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const hs = { Accept: 'application/json', 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const token = await getToken();
    if (token) {
      hs.Authorization = `Bearer ${token}`;
      console.log('[API] Sending request with token:', token.substring(0, 20) + '...');
    } else {
      console.warn('[API] No token found in storage!');
    }
  }

  let res;
  try {
    res = await fetch(buildUrl(path), { method, headers: hs, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error(`Tidak bisa terhubung ke ${API_URL}. Periksa Wi-Fi/IP.`);
  }
  return parseJsonResponse(res);
}

async function postForm(path, form, { auth = false, headers = {} } = {}) {
  const hs = { Accept: 'application/json', ...headers }; // JANGAN set Content-Type manual
  if (auth) {
    const token = await getToken();
    if (token) {
      hs.Authorization = `Bearer ${token}`;
      console.log('[API] Sending request with token:', token.substring(0, 20) + '...');
    } else {
      console.warn('[API] No token found in storage!');
    }
  }

  let res;
  try {
    res = await fetch(buildUrl(path), { method: 'POST', headers: hs, body: form });
  } catch {
    throw new Error(`Tidak bisa terhubung ke ${API_URL}. Periksa Wi-Fi/IP.`);
  }
  return parseJsonResponse(res);
}

// =====================
// ======  AUTH   ======
// =====================
export async function login(identity, password) {
  const { token, user } = await http('/m/auth/login', { method: 'POST', body: { identity, password } });
  await AsyncStorage.multiSet([['token', token], ['user', JSON.stringify(user)]]);
  return { token, user };
}

export const me = () => http('/m/auth/me', { auth: true });

export async function logout() {
  await AsyncStorage.multiRemove(['token', 'user']);
}

// =======================
// ======  REPORTS  ======
// =======================
export function createReport(payload) {
  return http('/m/reports', { method: 'POST', body: payload, auth: true });
}

export async function createReportWithPhoto(payload, fileUri) {
  const form = new FormData();
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, String(v));
  });

  if (fileUri) {
    const name = fileUri.split('/').pop() || 'photo.jpg';
    const type = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    form.append('photo', {
      uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
      name,
      type,
    });
  }
  return postForm('/m/reports', form, { auth: true });
}

export const fetchReportsMeta = () => http('/m/reports/meta', { auth: true });

// =======================
// ======  AVATAR  =======
// =======================

// Versi global untuk cache-busting <Image />
let __avatarVer = 0;
export function bumpAvatar() { __avatarVer++; }

export function avatarUrl(path) {
  if (!path) return null;
  const abs = /^https?:\/\//i.test(path) ? path : buildUrl(path);
  const sep = abs.includes('?') ? '&' : '?';
  return `${abs}${sep}v=${__avatarVer}`;
}

/**
 * Upload foto profil diri sendiri.
 * - Field FormData: "avatar"
 * - Mengembalikan { user } (dinormalisasi)
 * - Fallback endpoint jika server berbeda:
 *    1) /m/users/me/avatar   (disarankan untuk mobile)
 *    2) /api/users/me/avatar (pakai route web-admin)
 *    3) /auth/me/avatar      (implementasi lama)
 */
export async function uploadMyAvatar(fileUri) {
  if (!fileUri) throw new Error('File belum dipilih.');

  const name = fileUri.split('/').pop() || 'avatar.jpg';
  const type = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  const form = new FormData();
  form.append('avatar', {
    uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
    name,
    type,
  });

  const candidates = ['/m/users/me/avatar', '/api/users/me/avatar', '/auth/me/avatar'];
  let lastErr = null;

  for (const p of candidates) {
    try {
      const data = await postForm(p, form, { auth: true });
      const user = data?.user || data?.data || data?.me || null;
      if (user) await setStoredUser(user);
      bumpAvatar();
      return { user: user || null, raw: data };
    } catch (e) {
      const msg = String(e?.message || '');
      lastErr = e;
      if (/404/.test(msg) || /not\s+found/i.test(msg)) continue; // coba endpoint berikutnya
      break; // error lain -> hentikan
    }
  }
  throw (lastErr || new Error('Upload avatar gagal: endpoint tidak ditemukan.'));
}
