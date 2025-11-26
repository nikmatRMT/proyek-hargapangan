# 🚨 Race Condition Analysis & Solutions for HARPA BANUA

## 📋 Masalah yang Dihadapi

### Error Berulang:
```
E11000 duplicate key error collection: harga_pasar.laporan_harga index: id_1 dup key: { id: 1188 }
E11000 duplicate key error collection: harga_pasar.laporan_harga index: id_1 dup key: { id: 1196 }
```

### Pattern yang Teramati:
1. **Thread A** dapat ID 1188 → insert berhasil
2. **Thread B** dapat ID 1188 yang sama → coba insert → **ERROR**
3. **Thread C** dapat ID 1196 → insert berhasil
4. **Thread D** dapat ID 1196 yang sama → coba insert → **ERROR**

## 🔍 Root Cause Analysis

Masalah ini adalah **Classic Race Condition** di MongoDB:
- Beberapa proses concurrent mengakses `getNextSeq()` secara bersamaan
- Masing-masing generate ID yang sama dari counter
- Yang pertama berhasil insert, yang lain gagal karena ID sudah dipakai

## 🛠️ Solusi yang Telah Diimplementasikan

### ✅ Solusi Saat Ini:
1. **getNextSeq Enhancement**: Retry mechanism + conflict detection
2. **mobileReports.js Fix**: Hapus upsert logic, gunakan insertOne
3. **Database Indexes**: Unique index untuk mencegah duplikasi

### ❌ Mengapa Masih Terjadi:
1. **Atomic Counter Tidak Cukup**: `findOneAndUpdate` masih bisa di-interrupt
2. **High Concurrency**: Banyak request bersamaan dalam waktu singkat
3. **Session Conflicts**: MongoDB session bisa menyebabkan inconsistency

## 🔧 Solusi Komprehensif (RECOMMENDED)

### **1. Database-Level Locking**
```javascript
// Implement collection-level locking
async function insertLaporanHargaWithLock(data) {
  const { laporan_harga } = collections();
  
  // Create a unique lock document
  const lockId = `lock_${data.marketId}_${data.komoditasId}_${data.tanggal}`;
  const lockDoc = {
    _id: lockId,
    locked_by: req.mobileUser?.id,
    locked_at: new Date(),
    expires_at: new Date(Date.now() + 30000) // 30 detik
  };
  
  try {
    // Try to acquire lock
    const lockResult = await laporan_harga.insertOne(lockDoc);
    
    if (lockResult.insertedId) {
      // Lock acquired, proceed with insert
      const newId = await getNextSeq('laporan_harga');
      await laporan_harga.insertOne({
        id: newId,
        ...data,
        created_at: new Date(),
      });
      
      // Release lock
      await laporan_harga.deleteOne({ _id: lockId });
      return { success: true, id: newId };
    } else {
      // Lock failed, another process has it
      return { success: false, error: 'Data sedang diproses oleh petugas lain' };
    }
  } finally {
    // Clean up expired locks
    await laporan_harga.deleteMany({ 
      _id: { $regex: '^lock_' },
      locked_at: { $lt: new Date() }
    });
  } catch (err) {
    throw err;
  }
}
```

### **2. Application-Level Queuing**
```javascript
// Implement request queue untuk serialisasi input
import { Queue } from 'bull';
import Redis dari 'ioredis';

const reportQueue = new Queue('process-reports', {
  redis: { host: process.env.REDIS_URL, port: 6379 },
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Add to queue instead of direct processing
router.post('/', requireMobileAuth, upload.single('photo'), async (req, res) => {
  try {
    const job = await reportQueue.add('process-report', {
      data: req.body,
      file: req.file,
      user: req.mobileUser,
    });
    
    res.json({ 
      success: true, 
      message: 'Laporan ditambahkan ke antrian',
      jobId: job.id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### **3. Optimistic Concurrency Control**
```javascript
// Gunakan optimistic concurrency control
const MAX_CONCURRENT_REPORTS = 5; // Maksimal 5 report bersamaan

const activeReports = new Map();

// Check active reports per market+commodity+tanggal
async function checkActiveReports(marketId, komoditasId, tanggal) {
  const key = `${marketId}_${komoditasId}_${tanggal}`;
  return activeReports.has(key);
}

// Add to active reports
async function addActiveReport(marketId, komoditasId, tanggal) {
  const key = `${marketId}_${komoditasId}_${tanggal}`;
  activeReports.set(key, true);
  
  // Auto-remove after 30 minutes
  setTimeout(() => {
    activeReports.delete(key);
  }, 30 * 60 * 1000);
}

// Rate limiting middleware
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 3, // Maksimal 3 request per menit
  message: 'Terlalu banyak permintaan, coba lagi nanti',
});
```

## 📊 Implementasi Priority

### **🔴 HIGH PRIORITY: Database Locking**
- Implement collection-level locking untuk mencegah race condition
- Tambahkan TTL untuk automatic lock cleanup
- Gunakan transactions untuk atomic operations

### **🟡 MEDIUM PRIORITY: Request Queuing**
- Implement Redis queue untuk serialisasi request
- Add job status tracking dan retry mechanism
- Rate limiting untuk mencegah spam

### **🟢 LOW PRIORITY: Enhanced Monitoring**
- Add detailed logging untuk race condition detection
- Monitor active reports per market+commodity+tanggal
- Alert system untuk high-frequency duplicate attempts

## 🚀 Deployment Instructions

1. **Backup Database**: Export data penting sebelum implementasi locking
2. **Staging Environment**: Test solusi di staging terlebih dahulu
3. **Gradual Rollout**: Implement solusi secara bertahap
4. **Monitor Intensively**: Watch logs dan performance metrics

## 📞 Monitoring Strategy

### **Logs yang Harus Diwatch**:
1. **Duplicate Key Errors**: `E11000` pattern
2. **High Frequency Requests**: Multiple requests dari user/IP yang sama
3. **Lock Acquisition Failures**: Gagal dapatkan lock
4. **Queue Processing Time**: Time dari queue add ke completion

### **Alert Thresholds**:
- **Critical**: >10 duplicate errors per menit
- **Warning**: >5 duplicate errors per 5 menit
- **Info**: Race condition detected dan berhasil diatasi

---

## 📝 Kesimpulan

Race condition adalah masalah kompleks yang memerlukan solusi multi-layer:
1. **Database Locking** (HIGH PRIORITY)
2. **Request Queuing** (MEDIUM PRIORITY)  
3. **Enhanced Logic** (LOW PRIORITY)

Solusi yang ada saat ini (getNextSeq improvement) hanya address **symptom**, bukan **root cause**. Untuk solve sepenuhnya, perlu implementasi **database-level locking** atau **application-level queuing**.

**Rekomendasi**: Implementasi **database locking dengan collection-level locks** sebagai solusi jangka panjang.
