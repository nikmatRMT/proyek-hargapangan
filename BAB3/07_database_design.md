# 7. Perancangan Database

---

## 7.1 Spesifikasi Database

| Properti | Nilai |
|----------|-------|
| **DBMS** | MongoDB |
| **Hosting** | MongoDB Atlas |
| **Database Name** | harpa_banua |
| **Encoding** | UTF-8 |

---

## 7.2 Struktur Collection

### Collection: `pasar`

```javascript
{
  id: Number,           // PK, auto-increment
  nama_pasar: String,   // required, unique
  alamat: String,       // optional
  created_at: Date,
  updated_at: Date
}
```

**Indexes:** `{ id: 1 }` unique, `{ nama_pasar: 1 }` unique

---

### Collection: `komoditas`

```javascript
{
  id: Number,              // PK, auto-increment
  nama_komoditas: String,  // required, unique
  unit: String,            // default: "(Rp/Kg)"
  created_at: Date,
  updated_at: Date
}
```

**Indexes:** `{ id: 1 }` unique, `{ nama_komoditas: 1 }` unique

---

### Collection: `laporan_harga`

```javascript
{
  id: Number,            // PK, auto-increment
  tanggal_lapor: String, // format: "YYYY-MM-DD"
  market_id: Number,     // FK -> pasar.id
  komoditas_id: Number,  // FK -> komoditas.id
  user_id: Number,       // FK -> users.id (petugas penginput)
  harga: Number,         // dalam Rupiah
  keterangan: String,    // optional
  foto_url: String,      // URL dari Vercel Blob
  gps_url: String,       // URL Google Maps
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `{ id: 1 }` unique
- `{ market_id: 1, komoditas_id: 1, tanggal_lapor: 1 }` compound unique
- `{ user_id: 1 }` untuk query riwayat petugas

---

### Collection: `users`

```javascript
{
  id: Number,            // PK, auto-increment
  nip: String,           // 18 digit, unique
  nama_lengkap: String,  // required
  username: String,      // required, unique, lowercase
  password: String,      // bcrypt hash
  role: String,          // "admin" | "petugas"
  is_active: Number,     // 1 = active, 0 = inactive
  phone: String,         // optional
  alamat: String,        // optional
  foto: String,          // URL avatar
  created_at: Date,
  updated_at: Date
}
```

**Indexes:** `{ id: 1 }` unique, `{ username: 1 }` unique, `{ nip: 1 }` unique

---

### Collection: `counters` (System)

```javascript
{
  _id: String,    // collection name
  seq: Number     // current sequence
}
```

---

### Collection: `sessions` (System)

```javascript
{
  _id: String,       // session ID
  expires: Date,
  session: Object    // user data
}
```
