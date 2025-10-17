// services/mockApi.js

const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

const markets = [
  { id: 'bauntung', name: 'Pasar Bauntung' },
  { id: 'ujung_murung', name: 'Pasar Ujung Murung' },
  { id: 'lama', name: 'Pasar Lama' },
  { id: 'antasari', name: 'Pasar Sentra Antasari' },
];

const commodities = [
  { id: 'beras', name: 'Beras', unit: 'Rp/Kg' },
  { id: 'minyak_kemasan', name: 'Minyak Goreng Kemasan', unit: 'Rp/Liter' },
  { id: 'minyak_curah', name: 'Minyak Goreng Curah', unit: 'Rp/Liter' },
  { id: 'tepung_kemasan', name: 'Tepung Terigu Kemasan', unit: 'Rp/Kg' },
  { id: 'tepung_curah', name: 'Tepung Terigu Curah', unit: 'Rp/Kg' },
  { id: 'gula', name: 'Gula Pasir', unit: 'Rp/Kg' },
  { id: 'telur', name: 'Telur Ayam', unit: 'Rp/Kg' },
  { id: 'daging_sapi', name: 'Daging Sapi', unit: 'Rp/Kg' },
  { id: 'daging_ayam', name: 'Daging Ayam', unit: 'Rp/Kg' },
  { id: 'kedelai', name: 'Kedelai', unit: 'Rp/Kg' },
  { id: 'bawang_merah', name: 'Bawang Merah', unit: 'Rp/Kg' },
  { id: 'bawang_putih', name: 'Bawang Putih', unit: 'Rp/Kg' },
  { id: 'cabe_besar', name: 'Cabe Merah Besar', unit: 'Rp/Kg' },
  { id: 'cabe_rawit', name: 'Cabe Rawit', unit: 'Rp/Kg' },
  { id: 'ikan_haruan', name: 'Ikan Haruan/Gabus', unit: 'Rp/Kg' },
  { id: 'ikan_tongkol', name: 'Ikan Tongkol/Tuna', unit: 'Rp/Kg' },
  { id: 'ikan_mas', name: 'Ikan Mas/Nila', unit: 'Rp/Kg' },
  { id: 'ikan_patin', name: 'Ikan Patin', unit: 'Rp/Kg' },
  { id: 'ikan_papuyu', name: 'Ikan Papuyu/Betok', unit: 'Rp/Kg' },
  { id: 'ikan_bandeng', name: 'Ikan Bandeng', unit: 'Rp/Kg' },
  { id: 'ikan_kembung', name: 'Ikan Kembung/Pindang', unit: 'Rp/Kg' },
];

let reports = []; // in-memory mock

export const mockApi = {
  async login({ username, password }) {
    await delay();
    if ((username === 'admin' || username === 'petugas') && password === 'password') {
      return {
        token: 'mock-token-123',
        user: {
          id: 'u1',
          name: username === 'admin' ? 'Admin DKP3' : 'Budi Sanjaya',
          role: username === 'admin' ? 'Admin' : 'Petugas',
          phone: '+62 812-3456-7890',
          username,
        },
      };
    }
    throw new Error('Kredensial salah');
  },

  async getMarkets() {
    await delay(300);
    return markets;
  },

  async getCommodities() {
    await delay(300);
    return commodities;
  },

  async createReport({ marketId, commodityId, price, notes, photoUri, gps, date }) {
    await delay(600);
    reports.push({
      id: `r_${Date.now()}`,
      marketId,
      commodityId,
      price,
      notes: notes || '',
      photoUri: photoUri || null,
      gps: gps || null,
      date: date || new Date().toISOString().slice(0, 10),
    });
    return { ok: true };
  },

  async listReports() {
    await delay(300);
    return reports;
  },
};
