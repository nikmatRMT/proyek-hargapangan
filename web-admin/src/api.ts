// Update hanya tanggal laporan
export async function updateReportDate(id: number, tanggal: string, notes?: string) {
  const res = await fetch(joinUrl(`/api/prices/${id}`), {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tanggal, notes }),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}
// src/api.ts

// =====================
// Konfigurasi dasar
// =====================
// Prefer VITE_API_URL for explicit backend configuration
// Fallback order:
// 1) import.meta.env.VITE_API_URL (explicit backend URL)
// 2) window.location.origin (when running in browser)
// 3) https://harpa-banua.vercel.app
export const API_BASE = (
  import.meta.env.VITE_API_URL
  || (typeof window !== 'undefined' && window.location && window.location.origin)
  || 'https://harpa-banua.vercel.app'
).replace(/\/$/, '');

function joinUrl(path: string) {
  // pastikan hanya satu slash
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function readJsonResponse(res: Response) {
  const text = await res.text();
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) {
    throw new Error(`Respon bukan JSON (HTTP ${res.status}). Body: ${text.slice(0, 200)}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Server mengirim JSON tidak valid.');
  }
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: any;
  credentials?: RequestCredentials; // 'include' untuk route yang butuh session
  headers?: Record<string, string>;
};

async function http(path: string, opts: FetchOpts = {}) {
  const { method = 'GET', body, credentials, headers = {} } = opts;
  const isJson = body && !(body instanceof FormData);

  const res = await fetch(joinUrl(path), {
    method,
    credentials,
    headers: {
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: isJson ? JSON.stringify(body) : body,
  });

  const data = await readJsonResponse(res);
  if (!res.ok) {
    const err: any = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// =====================
// Generic HTTP methods
// =====================
export function get(path: string) {
  return http(path, { credentials: 'include' });
}

export function post(path: string, body?: any) {
  return http(path, { method: 'POST', body, credentials: 'include' });
}

/** Patch arbitrary fields for a price row by id */
export async function patchPriceById(id: number, body: Record<string, any>) {
  return http(`/api/prices/${id}`, { method: 'PATCH', body, credentials: 'include' });
}

export function put(path: string, body?: any) {
  return http(path, { method: 'PUT', body, credentials: 'include' });
}

export function del(path: string) {
  return http(path, { method: 'DELETE', credentials: 'include' });
}

// =====================
// Tipe ringan untuk dashboard
// =====================
export type Market = { id: number; nama?: string; name?: string; nama_pasar?: string };
export type Commodity = { id: number; nama?: string; name?: string; nama_komoditas?: string };

export type PriceRow = {
  id?: number;
  date?: string;              // atau 'tanggal'
  tanggal?: string;
  market_id?: number;
  commodity_id?: number;
  price?: number;             // atau 'harga'
  harga?: number;
  unit?: string;
  keterangan?: string;
  notes?: string;
  foto_url?: string;
  gps_url?: string;
};

// =====================
// API Dashboard
// =====================
export function getMarkets() {
  // Sebagian proyek pakai /api/markets, sebagian /api/pasar
  return http('/api/markets', { credentials: 'include' }).catch(async (e) => {
    if (String(e.message).includes('404')) return http('/api/pasar', { credentials: 'include' });
    throw e;
  });
}

export function getCommodities() {
  // Sebagian proyek pakai /api/commodities, sebagian /api/komoditas
  return http('/api/commodities', { credentials: 'include' }).catch(async (e) => {
    if (String(e.message).includes('404')) return http('/api/komoditas', { credentials: 'include' });
    throw e;
  });
}

// === CRUD helper untuk Markets ===
export async function createMarket(nama_pasar: string) {
  // Try multiple endpoint names used across different backends
  const candidates = ['/api/markets', '/api/pasar'];
  let lastErr: any = null;
  for (const p of candidates) {
    try { return await post(p, { nama_pasar }); } catch (e: any) { lastErr = e; if (e?.status !== 404) throw e; }
  }
  throw lastErr || new Error('createMarket: endpoint tidak ditemukan');
}

export async function updateMarket(id: number, nama_pasar: string) {
  const candidates = [`/api/markets/${id}`, `/api/pasar/${id}`];
  let lastErr: any = null;
  for (const p of candidates) {
    try { return await put(p, { nama_pasar }); } catch (e: any) { lastErr = e; if (e?.status !== 404) throw e; }
  }
  throw lastErr || new Error('updateMarket: endpoint tidak ditemukan');
}

export async function deleteMarket(id: number) {
  const candidates = [`/api/markets/${id}`, `/api/pasar/${id}`];
  let lastErr: any = null;
  for (const p of candidates) {
    try { return await del(p); } catch (e: any) { lastErr = e; if (e?.status !== 404) throw e; }
  }
  throw lastErr || new Error('deleteMarket: endpoint tidak ditemukan');
}

// === CRUD helper untuk Commodities ===
export async function createCommodity(nama_komoditas: string) {
  const candidates = ['/api/commodities', '/api/komoditas'];
  let lastErr: any = null;
  for (const p of candidates) {
    try { return await post(p, { nama_komoditas }); } catch (e: any) { lastErr = e; if (e?.status !== 404) throw e; }
  }
  throw lastErr || new Error('createCommodity: endpoint tidak ditemukan');
}

export async function updateCommodity(id: number, nama_komoditas: string) {
  const candidates = [`/api/commodities/${id}`, `/api/komoditas/${id}`];
  let lastErr: any = null;
  for (const p of candidates) {
    try { return await put(p, { nama_komoditas }); } catch (e: any) { lastErr = e; if (e?.status !== 404) throw e; }
  }
  throw lastErr || new Error('updateCommodity: endpoint tidak ditemukan');
}

export async function deleteCommodity(id: number) {
  const candidates = [`/api/commodities/${id}`, `/api/komoditas/${id}`];
  let lastErr: any = null;
  for (const p of candidates) {
    try { return await del(p); } catch (e: any) { lastErr = e; if (e?.status !== 404) throw e; }
  }
  throw lastErr || new Error('deleteCommodity: endpoint tidak ditemukan');
}

// Lightweight helpers to fetch normalized options for dropdowns (used by ReportsTable)
export async function fetchMarketsOptions() {
  const res = await getMarkets();
  const list = Array.isArray((res as any).rows) ? (res as any).rows : Array.isArray(res) ? (res as any) : [];
  return list.map((m: any) => ({ value: m.id, label: m.nama_pasar || m.name || m.nama || String(m.id) }));
}

export async function fetchCommoditiesOptions() {
  const res = await getCommodities();
  const list = Array.isArray((res as any).rows) ? (res as any).rows : Array.isArray(res) ? (res as any) : [];
  return list.map((k: any) => ({ value: k.id, label: k.nama_komoditas || k.name || k.nama || String(k.id) }));
}

/** Submit data harga dari petugas (via web atau mobile) */
export function submitPriceReport(payload: { marketId: number; prices: Array<{ commodityId: number; price: number }> }) {
  return http('/api/mobile/reports', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

/** Submit laporan harga mobile format (untuk petugas web) */
export function submitMobileReport(payload: {
  date: string;
  market_name: string;
  commodity_name: string;
  unit: string;
  price: number;
  notes?: string;
  gps_lat?: string;
  gps_lng?: string;
}) {
  return http('/m/reports', {
    method: 'POST',
    credentials: 'include',
    body: payload  // Tidak perlu JSON.stringify, http() akan handle itu
  });
}

/** Ambil harga (opsional filter) — contoh: getPrices({ date:'2025-10-12', market_id:3 }) */
export function getPrices(params?: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams();

  const shouldKeep = (v: any) => {
    if (v === undefined || v === null) return false;
    const s = String(v).trim().toLowerCase();
    if (s === '' || s === 'all' || s === 'undefined' || s === 'null') return false;
    return true;
  };

  Object.entries(params || {}).forEach(([k, v]) => {
    if (shouldKeep(v)) q.append(k, String(v));
  });

  const qs = q.toString();
  return http(`/api/prices${qs ? `?${qs}` : ''}`, { credentials: 'include' });
}
/** Compat: beberapa hook lama mengharapkan 'fetchReports' */
export function fetchReports(
  params?: Record<string, string | number | boolean | undefined>
) {
  return getPrices(params);
}

// =====================
// Upload Excel (wajib pilih 1 pasar; fallback endpoint)
// =====================
type UploadExcelArgs = {
  file: File;
  marketName?: string;   // nama pasar yang dipilih (opsional kalau rekap=true)
  marketId?: number;     // id pasar yang dipilih (opsional kalau rekap=true)
  bulk: boolean;        // true: impor multi-bulan dari satu file; false: satu bulan (butuh month & year)
  month?: string;       // '01'..'12' (wajib bila bulk=false)
  year?: string;        // '2025' (wajib bila bulk=false)
  truncate?: boolean;   // default false
  rekap?: boolean;
};

/**
 * Upload ke endpoint yang tersedia.
 * Urutan fallback:
 *  1) /api/import-excel/upload
 *  2) /api/import-excel
 *  3) /api/import-excel/bulk
 */
export async function uploadExcel(args: UploadExcelArgs) {
  const { file, marketName, marketId, bulk, month, year, truncate, rekap } = args;

  if (!file) throw new Error('File Excel belum dipilih.');
  // Kalau rekap mode, backend akan mencoba mendeteksi pasar per-sheet.
  // Jadi pasar tidak wajib bila rekap === true. Default: require market.
  if (!rekap && (!marketName || typeof marketId !== 'number')) {
    throw new Error('Wajib pilih pasar tertentu sebelum impor.');
  }
  if (!bulk && (!month || !year)) {
    throw new Error('Bulan & Tahun wajib diisi untuk impor satu-bulan.');
  }

  const form = new FormData();
  form.append('file', file);
  // Hanya kirim market jika ada (rekap mode boleh tanpa market)
  if (marketName) form.append('marketName', marketName);
  if (typeof marketId === 'number') form.append('marketId', String(marketId));
  form.append('rekap', rekap ? '1' : '0');
  form.append('bulk', bulk ? '1' : '0');
  if (!bulk) {
    form.append('month', String(month));
    form.append('year', String(year));
  } else if (year) {
    // backend bulk milikmu bisa pakai 'year' (atau menebak dari nama file)
    form.append('year', String(year));
  }

  const base = '/api/import-excel';
  // 🔧 KUNCI FIX: urutan kandidat tergantung mode
  const candidates = bulk
    ? [
        `${base}/bulk?truncate=${truncate ? 1 : 0}`,   // coba BULK dulu
        `${base}?truncate=${truncate ? 1 : 0}`,
        `${base}/upload?truncate=${truncate ? 1 : 0}`,
      ]
    : [
        `${base}/upload?truncate=${truncate ? 1 : 0}`, // single-bulan: /upload dulu
        `${base}?truncate=${truncate ? 1 : 0}`,
      ];

  // helper untuk baca JSON aman
  async function readJsonResponseInner(res: Response) {
    const text = await res.text();
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      throw new Error(`Respon bukan JSON (HTTP ${res.status}). Body: ${text.slice(0, 200)}`);
    }
    try { return text ? JSON.parse(text) : {}; }
    catch { throw new Error('Server mengirim JSON tidak valid.'); }
  }

  let lastErr: unknown = null;
  for (const url of candidates) {
    try {
  const res = await fetch(`${(import.meta.env.VITE_API_URL || 'https://harpa-banua.vercel.app').replace(/\/$/,'')}${url}`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      // 404 → lanjut kandidat berikutnya
      if (res.status === 404) continue;

      const data = await readJsonResponseInner(res);

      if (!res.ok) {
        // Tambahkan hint yang jelas untuk 400 umum
        const msg = String(data?.message || '');
        if (/month.*year.*wajib/i.test(msg)) {
          throw new Error('Server minta Bulan & Tahun. Nonaktifkan mode "bulk" atau isi month/year.');
        }
        if (/tahun.*tidak.*terdeteksi/i.test(msg)) {
          throw new Error('Server butuh Year untuk bulk. Isi "year" atau beri akhiran nama file "-2025.xlsx".');
        }
        if (/file.*wajib/i.test(msg)) {
          throw new Error('File tidak terkirim. Pastikan field FormData bernama "file".');
        }
        throw new Error(data?.message || `Import gagal (HTTP ${res.status})`);
      }
      return data; // sukses
    } catch (e) {
      lastErr = e;
      // untuk error selain 404, hentikan loop
      if (!(e instanceof Error) || !/404/.test(e.message)) break;
    }
  }

  throw (lastErr instanceof Error ? lastErr : new Error('Import gagal: endpoint tidak ditemukan.'));
}

// =====================
// Update harga (inline edit di tabel)
// =====================
type UpdatePriceArgs =
  | { id: number; price: number; unit?: string; notes?: string } // by id (paling umum)
  | {
      date: string; market_id: number; commodity_id: number;
      price: number; unit?: string; notes?: string;
    }; // by key (kombinasi)

export async function updateReportPrice(args: UpdatePriceArgs) {
  // Normalisasi payload
  const price = Number(('price' in args && args.price) ?? NaN);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Harga harus angka > 0.');
  }

  const unit = 'unit' in args ? args.unit : undefined;
  const notes = 'notes' in args ? args.notes : undefined;

  // Kandidat endpoint yang sering dipakai
  const candidates: Array<{ path: string; method: 'PATCH' | 'PUT' | 'POST'; body?: any }> = [];

  // 1) PATCH /api/prices/:id  (body: { price, unit, notes })
  if ('id' in args && typeof args.id === 'number') {
    candidates.push({
      method: 'PATCH',
      path: `/api/prices/${args.id}`,
      body: { price, unit, notes },
    });
    // 2) PATCH /api/prices (body: { id, price, ... })
    candidates.push({
      method: 'PATCH',
      path: '/api/prices',
      body: { id: args.id, price, unit, notes },
    });
    // 3) PUT /api/prices/:id (sebagian proyek lama)
    candidates.push({
      method: 'PUT',
      path: `/api/prices/${args.id}`,
      body: { price, unit, notes },
    });
  } else if (
    'date' in args &&
    'market_id' in args &&
    'commodity_id' in args
  ) {
    const payload = {
      date: (args as any).date,
      market_id: (args as any).market_id,
      commodity_id: (args as any).commodity_id,
      price,
      unit,
      notes,
    };
    // 4) POST /api/prices/upsert  (by key)
    candidates.push({ method: 'POST', path: '/api/prices/upsert', body: payload });
    // 5) PATCH /api/prices (body lengkap)
    candidates.push({ method: 'PATCH', path: '/api/prices', body: payload });
  } else {
    throw new Error('Argumen update tidak lengkap (butuh id ATAU {date, market_id, commodity_id}).');
  }

  let lastErr: unknown = null;
  for (const c of candidates) {
    try {
      const res = await fetch(joinUrl(c.path), {
        method: c.method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c.body ?? {}),
      });
      if (res.status === 404) continue; // coba endpoint berikutnya

      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.message || `Gagal update (HTTP ${res.status})`);
      return data; // sukses
    } catch (e) {
      lastErr = e;
      if (!(e instanceof Error) || !/404/.test(e.message)) break;
    }
  }

  throw (lastErr instanceof Error ? lastErr : new Error('Gagal update harga: endpoint tidak ditemukan.'));
}

// =====================
// Bulk Delete (preview & eksekusi) — dipakai Dashboard.tsx
// =====================
type BulkArgs = { marketId: number; year: number; month: number };

/** Preview: hitung jumlah baris yang akan dihapus */
export async function previewBulkDelete({ marketId, year, month }: BulkArgs) {
  if (!marketId || !year || !month) throw new Error('marketId, year, month wajib diisi.');
  const payload = { marketId: Number(marketId), year: Number(year), month: Number(month) };

  // Coba beberapa pola endpoint yang umum
  const candidates: Array<{ method: 'POST' | 'GET'; path: string; body?: any }> = [
    { method: 'POST', path: '/api/prices/bulk-delete/preview', body: payload },
    { method: 'POST', path: '/api/reports/bulk-delete/preview', body: payload },
    { method: 'GET',  path: `/api/prices/bulk-delete/preview?marketId=${payload.marketId}&year=${payload.year}&month=${payload.month}` },
    { method: 'POST', path: '/api/prices/preview-bulk-delete', body: payload },
    { method: 'POST', path: '/api/prices/delete/preview', body: payload },
  ];

  let lastErr: unknown = null;
  for (const c of candidates) {
    try {
      const res = await fetch(joinUrl(c.path), {
        method: c.method,
        credentials: 'include',
        headers: c.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: c.method === 'POST' ? JSON.stringify(c.body ?? {}) : undefined,
      });
      if (res.status === 404) continue;
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.message || `Gagal preview (HTTP ${res.status})`);
      // Normalisasi angka total
      const total =
        Number(data?.total ?? data?.count ?? data?.affected ?? data?.length ?? 0);
      return { total };
    } catch (e) {
      lastErr = e;
      if (!(e instanceof Error) || !/404/.test(e.message)) break;
    }
  }
  throw (lastErr instanceof Error ? lastErr : new Error('Preview gagal: endpoint tidak ditemukan.'));
}

/** Eksekusi: hapus data sebulan untuk 1 pasar */
export async function bulkDeleteReports({ marketId, year, month }: BulkArgs) {
  if (!marketId || !year || !month) throw new Error('marketId, year, month wajib diisi.');
  const payload = { marketId: Number(marketId), year: Number(year), month: Number(month) };

  const candidates: Array<{ method: 'POST' | 'DELETE'; path: string; body?: any }> = [
    { method: 'POST',   path: '/api/prices/bulk-delete', body: payload },
    { method: 'DELETE', path: '/api/prices/bulk-delete', body: payload }, // sebagian backend menerima body di DELETE
    { method: 'POST',   path: '/api/reports/bulk-delete', body: payload },
    { method: 'DELETE', path: `/api/prices?marketId=${payload.marketId}&year=${payload.year}&month=${payload.month}&scope=month` },
  ];

  let lastErr: unknown = null;
  for (const c of candidates) {
    try {
      const res = await fetch(joinUrl(c.path), {
        method: c.method,
        credentials: 'include',
        headers: c.body ? { 'Content-Type': 'application/json' } : undefined,
        body: c.body ? JSON.stringify(c.body) : undefined,
      });
      if (res.status === 404) continue;

      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data?.message || `Gagal hapus (HTTP ${res.status})`);
      const deleted =
        Number(data?.deleted ?? data?.affected ?? data?.count ?? data?.total ?? 0);
      return { deleted };
    } catch (e) {
      lastErr = e;
      if (!(e instanceof Error) || !/404/.test(e.message)) break;
    }
  }
  throw (lastErr instanceof Error ? lastErr : new Error('Hapus gagal: endpoint tidak ditemukan.'));
}

export function subscribePrices(
  onEvent: (payload: any) => void,
  opts?: { marketId?: number }
) {
  const base = (import.meta.env.VITE_API_URL || 'https://harpa-banua.vercel.app').replace(/\/$/, '');
  const url = `${base}/sse/prices${opts?.marketId ? `?marketId=${opts.marketId}` : ''}`;

  // @ts-ignore: support withCredentials
  const es = new EventSource(url, { withCredentials: true });

  es.addEventListener('prices', (ev: MessageEvent) => {
    try { onEvent(JSON.parse(ev.data)); } catch {}
  });

  // optional:
  // es.addEventListener('ready',  () => console.log('[SSE] ready'));
  // es.addEventListener('ping',   () => console.debug('[SSE] ping'));

  es.onerror = () => {
    // Default EventSource auto-reconnect; biarkan
  };

  return () => es.close();
}

// === LOGOUT (WEB-ADMIN) ===
export function logoutWeb() {
  return http('/auth/logout', { method: 'POST', credentials: 'include' });
}

// =====================
// ===== PROFIL (TAMBAHAN) =====
// =====================

// GET profil akun yang sedang login
export function apiMe() {
  return http('/api/me', { credentials: 'include' }).catch(() =>
    http('/auth/me', { credentials: 'include' })
  );
}

// UPDATE profil akun yang sedang login
export function apiUpdateMe(payload: any) {
  return http('/api/users/me', { method: 'PUT', credentials: 'include', body: payload });
}

// UPLOAD avatar akun yang sedang login (FormData field: 'avatar')
export async function apiUploadAvatar(file: File) {
  if (!file) throw new Error('File belum dipilih');

  // coba ambil id user dari localStorage agar bisa pakai endpoint /api/users/:id/photo
  let uid: number | null = null;
  try { uid = JSON.parse(localStorage.getItem('auth_user') || 'null')?.id ?? null; } catch {}

  // Endpoint kandidat yang sering dipakai di berbagai backend
  const endpoints = [
    '/api/users/me/avatar',
    '/api/users/avatar',
    '/api/users/me/photo',
    uid ? `/api/users/${uid}/photo` : '',   // hanya dipakai kalau uid ada
    '/api/me/avatar',
    '/auth/me/avatar',
    '/api/upload/avatar',
    '/api/users/upload-avatar',
  ].filter(Boolean);

  // Nama field kandidat di FormData (backend sering beda-beda)
  const fields = ['avatar', 'file', 'photo', 'image'];

  // helper fetch FormData + parsing JSON (toleran)
  async function postForm(url: string, fd: FormData) {
    const res = await fetch(joinUrl(url), {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (res.status === 404) return { _404: true as const };

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();
    let data: any = {};
    if (ct.includes('application/json')) {
      try { data = text ? JSON.parse(text) : {}; } catch { /* dibiarkan kosong */ }
    } else {
      // beberapa backend balas text sederhana—anggap gagal kalau bukan JSON
      if (!res.ok) {
        throw new Error(`Upload gagal (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      // kalau OK tapi bukan JSON, tetap kembalikan minimal ok:true
      data = { ok: true };
    }

    if (!res.ok) {
      throw new Error(data?.message || `Upload gagal (HTTP ${res.status})`);
    }
    return data;
  }

  // normalisasi path foto → selalu bisa dipakai <img src=...>
  function normalizeFoto(f: any): string | undefined {
    if (!f) return undefined;
    const s = String(f);
    if (s.startsWith('http')) return s;
    if (s.startsWith('/uploads/')) return s;
    return '/uploads/' + s.replace(/^\/+/, '');
  }

  // Coba kombinasi endpoint x field sampai ada yang berhasil
  let lastErr: unknown = null;
  for (const ep of endpoints) {
    for (const field of fields) {
      try {
        const fd = new FormData();
        fd.append(field, file);

        const data = await postForm(ep, fd);
        if ((data as any)?._404) continue;

        // ambil kemungkinan lokasi foto yang dikirim backend
        const foto =
          data?.user?.foto ??
          data?.foto ??
          data?.path ??
          data?.url ??
          data?.avatar ??
          undefined;

        const final = normalizeFoto(foto);

        // kalau backend kirim objek user, normalisasikan juga
        if (data?.user) {
          data.user = { ...data.user, foto: normalizeFoto(data.user.foto ?? final) };
        }

        // kembalikan bentuk yang dipakai Profile.tsx
        return data?.user
          ? { user: data.user, foto: data.user.foto ?? final }
          : { ok: true, foto: final };
      } catch (e) {
        lastErr = e;
        // kalau error bukan 404 (sudah ditangani di postForm), lanjut kandidat berikutnya
      }
    }
  }

  throw (lastErr instanceof Error ? lastErr : new Error('Upload gagal: tidak ada endpoint yang cocok.'));
}
