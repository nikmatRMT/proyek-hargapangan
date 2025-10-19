# 🔐 Security & Configuration Files

## ⚠️ PENTING - File Sensitif

File-file berikut **TIDAK BOLEH** di-commit ke repository karena mengandung data sensitif:

### 📛 Jangan Di-Push:
- `API-AUTH-DOCS.md` - Berisi credentials login dan token asli
- `ENVIRONMENT-SETUP.md` - Berisi MongoDB URI, API keys, dan passwords
- `.env` - File environment variables lokal
- `secrets/` - Folder berisi data sensitif

### ✅ Aman untuk Di-Push:
- `API-AUTH-DOCS.md.example` - Template dokumentasi API (tanpa credentials asli)
- `ENVIRONMENT-SETUP.md.example` - Template setup environment variables
- `.env.example` - Template file environment
- `README.md`, `TROUBLESHOOTING.md` - Dokumentasi umum

---

## 📝 Setup untuk Developer Baru

Jika Anda clone repository ini untuk pertama kali:

### 1. Copy Template Files
```bash
# Di root project
cp API-AUTH-DOCS.md.example API-AUTH-DOCS.md
cp ENVIRONMENT-SETUP.md.example ENVIRONMENT-SETUP.md

# Di folder web-admin
cd web-admin
cp .env.example .env
cp .env.example .env.production
```

### 2. Minta Credentials dari Admin
Hubungi admin project untuk mendapatkan:
- MongoDB URI (connection string)
- MongoDB Data API URL & Key
- Username & password untuk login
- URL backend dan frontend yang sudah deploy

### 3. Isi File dengan Credentials Asli
Edit file-file yang sudah di-copy dengan nilai credentials yang benar:
- `API-AUTH-DOCS.md` - ganti `<ASK_ADMIN>` dengan credentials asli
- `ENVIRONMENT-SETUP.md` - ganti placeholder dengan nilai MongoDB asli
- `web-admin/.env` - isi dengan URL backend

### 4. Set Environment Variables di Cloud
Ikuti instruksi di `ENVIRONMENT-SETUP.md` untuk:
- Set env vars di Vercel Dashboard
- Set env vars di Netlify Dashboard
- Redeploy setelah set env vars

---

## 🛡️ Security Best Practices

### ✅ DO:
1. **Gunakan `.gitignore`** untuk block file sensitif
2. **Gunakan template files** (`.example`) di repository
3. **Set credentials via dashboard** Vercel/Netlify, bukan hardcode
4. **Rotate credentials** secara berkala (minimal 6 bulan)
5. **Review commits** sebelum push untuk memastikan tidak ada credentials
6. **Use strong passwords** minimal 12 karakter

### ❌ DON'T:
1. **Jangan commit** file `.env` atau credentials asli
2. **Jangan hardcode** API keys di source code
3. **Jangan share** credentials via chat/email yang tidak terenkripsi
4. **Jangan use** credentials yang sama untuk development & production
5. **Jangan ignore** security warnings dari GitHub/Vercel
6. **Jangan expose** admin credentials di public documentation

---

## 🔍 Cara Cek Repository Bersih dari Credentials

### Cek Local Files:
```bash
# Cek apakah file sensitif ter-track di Git
git ls-files | grep -E "API-AUTH-DOCS.md$|ENVIRONMENT-SETUP.md$|\.env$"

# Seharusnya tidak ada output (atau hanya file .example)
```

### Cek di GitHub:
1. Buka repository di https://github.com/nikmatRMT/proyek-hargapangan
2. Cari file `API-AUTH-DOCS.md` atau `ENVIRONMENT-SETUP.md`
3. Seharusnya **tidak ada** (hanya ada versi `.example`)

### Jika Terdeteksi Credentials Ter-commit:
```bash
# Hapus dari Git history (HATI-HATI!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch API-AUTH-DOCS.md ENVIRONMENT-SETUP.md" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (akan overwrite remote history)
git push origin --force --all
```

⚠️ **WARNING:** `git filter-branch` mengubah history. Koordinasi dengan team sebelum melakukan ini!

---

## 📋 Checklist Security Audit

Sebelum push ke repository:

- [ ] Cek tidak ada credentials di code: `git diff`
- [ ] Pastikan `.gitignore` sudah benar
- [ ] File `.env` tidak di-track: `git status`
- [ ] Hanya file `.example` yang di-push
- [ ] Review all changes: `git log -p -1`
- [ ] No API keys in commit messages
- [ ] No passwords in file names

---

## 🆘 Incident Response

### Jika Credentials Ter-push ke GitHub:

**IMMEDIATE ACTION (dalam 5 menit):**
1. ⚠️ **Rotate semua credentials** yang ter-expose:
   - Change MongoDB password
   - Regenerate API keys
   - Revoke leaked tokens
   
2. 🔒 **Update di Dashboard:**
   - Update env vars di Vercel
   - Update env vars di Netlify
   - Redeploy semua services

3. 🗑️ **Hapus dari repository:**
   ```bash
   git rm --cached <leaked_file>
   git commit -m "Remove leaked credentials"
   git push origin main
   ```

4. 📧 **Notify team** tentang incident

**FOLLOW-UP (dalam 24 jam):**
1. Review access logs MongoDB untuk aktivitas mencurigakan
2. Check Vercel/Netlify logs untuk unauthorized access
3. Implement additional security measures (IP whitelist, 2FA)
4. Update security documentation
5. Post-mortem meeting

---

## 📚 Related Documentation

- `TROUBLESHOOTING.md` - Troubleshooting guide umum
- `README.md` - Project overview dan setup
- `API-AUTH-DOCS.md.example` - Template dokumentasi API
- `ENVIRONMENT-SETUP.md.example` - Template setup environment

---

**Last Updated:** October 19, 2025  
**Maintained by:** Project Admin  
**Contact:** Via GitHub Issues
