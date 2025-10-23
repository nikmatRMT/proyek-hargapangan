# 🎨 Panduan Ganti Icon Web-Admin (Tanpa Redeploy)

## 📁 File Icon yang Perlu Diganti

Di hosting, cari folder `web-admin/public/` dan ganti 3 file ini:

### 1. **favicon.ico** (16x16 atau 32x32)
   - Icon di browser tab
   - Format: `.ico`
   
### 2. **logo192.png** (192x192)
   - Icon untuk PWA Android
   - Format: `.png`

### 3. **logo512.png** (512x512)
   - Icon untuk PWA iOS & splash screen
   - Format: `.png`

---

## 🚀 Cara Upload (Pilih salah satu)

### **Opsi 1: Via FTP (FileZilla, WinSCP, dll)**

1. Buka FTP client
2. Connect ke hosting (host, username, password)
3. Navigate ke folder: `public_html/web-admin/public/` (atau sesuai struktur hosting)
4. Upload/replace 3 file di atas
5. Done! Refresh browser dengan `Ctrl+F5`

### **Opsi 2: Via cPanel File Manager**

1. Login ke cPanel hosting
2. Buka **File Manager**
3. Navigate ke: `public_html/web-admin/public/`
4. Upload file (drag & drop atau klik Upload)
5. Klik **Reload** untuk replace file lama
6. Done! Refresh browser dengan `Ctrl+F5`

### **Opsi 3: Via Hosting Dashboard (Hostinger, Niagahoster, dll)**

1. Login ke hosting dashboard
2. Cari menu **File Manager** atau **Website Files**
3. Navigate ke folder `web-admin/public/`
4. Upload & replace file
5. Done!

---

## 📝 Catatan Penting

- ✅ **Tidak perlu restart server**
- ✅ **Tidak perlu rebuild/redeploy**
- ✅ **Tidak perlu commit ke Git**
- ✅ **Clear browser cache** jika icon tidak langsung berubah: `Ctrl+F5` (Windows) atau `Cmd+Shift+R` (Mac)
- ⚠️ **Backup file lama** sebelum replace (rename jadi `.bak`)

---

## 🔧 Convert Icon dari AppIcons

Jika punya file dari AppIcons:

```bash
# Untuk favicon (butuh convert ke .ico)
# Gunakan online converter: https://convertio.co/png-ico/

# Untuk logo192.png
Gunakan: 180.png atau 192.png dari AppIcons

# Untuk logo512.png  
Gunakan: 512.png atau 1024.png (resize ke 512x512)
```

---

## ✅ Verifikasi Setelah Upload

1. Buka web-admin di browser
2. Tekan `Ctrl+F5` untuk clear cache
3. Check browser tab - icon harus berubah
4. Check di mobile - add to home screen untuk test PWA icon

---

## 🆘 Troubleshooting

**Icon tidak berubah?**
- Clear browser cache: `Ctrl+Shift+Del` → Clear all
- Check file size - jangan terlalu besar (< 500KB)
- Check file format - PNG harus PNG, ICO harus ICO
- Tunggu 5-10 menit (CDN cache)
- Hard refresh: `Ctrl+F5`

**File tidak bisa diupload?**
- Check permission folder (755)
- Check disk space hosting
- Check file size limit
- Rename file yang lama dulu

---

© 2025 HARPA BANUA
