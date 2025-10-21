# 📱 Build APK HARPA BANUA - Panduan Lengkap

## 🎯 Option 1: Expo Application Services (EAS) - Recommended ✨

### Prerequisites:
- Akun Expo (gratis di https://expo.dev)
- Sudah install EAS CLI: `npm install -g eas-cli`

### Langkah-langkah:

#### 1. **Buat Akun Expo** (Sekali saja)
```bash
# Buka browser
https://expo.dev/signup

# Atau langsung dari terminal
npx expo register
```

#### 2. **Login ke EAS**
```bash
cd aplikasi-mobile
eas login
```

#### 3. **Configure Build**
```bash
eas build:configure
```

Pilih:
- Platform: **Android**
- Build type: **APK** (lebih mudah untuk testing)

#### 4. **Build APK**
```bash
# Build APK (untuk install langsung)
eas build --platform android --profile preview

# Atau build AAB (untuk Google Play Store)
eas build --platform android --profile production
```

#### 5. **Download APK**
Setelah build selesai (±10-15 menit):
- Link download akan muncul di terminal
- Atau buka: https://expo.dev/accounts/[username]/projects/harpa-banua/builds

---

## 🔨 Option 2: Local Build dengan Android Studio

### Prerequisites:
- Android Studio terinstall
- JDK 17 terinstall
- Android SDK & Build Tools

### Langkah-langkah:

#### 1. **Generate Native Project**
```bash
cd aplikasi-mobile
npx expo prebuild --platform android
```

#### 2. **Build dengan Gradle**
```bash
cd android
.\gradlew.bat assembleRelease
```

#### 3. **Lokasi APK**
APK akan ada di:
```
aplikasi-mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 🚀 Option 3: Expo Development Build (Tanpa Akun)

Untuk testing saja, tanpa build APK:

#### 1. **Install Expo Go**
- Download dari Play Store: **Expo Go**
- Atau: https://play.google.com/store/apps/details?id=host.exp.exponent

#### 2. **Run Development Server**
```bash
cd aplikasi-mobile
npx expo start
```

#### 3. **Scan QR Code**
- Buka Expo Go di HP
- Scan QR code dari terminal
- App akan load langsung

---

## 📋 Build Profiles (eas.json)

Setelah `eas build:configure`, edit `eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## 🎨 App Configuration

**Package Name:** `com.dkp3.harpabanua`
**App Name:** HARPA BANUA
**Version:** 1.0.0

---

## 🐛 Troubleshooting

### "Expo account required"
→ Buat akun gratis di https://expo.dev/signup

### "Android SDK not found"
→ Install Android Studio dari https://developer.android.com/studio

### "Build failed"
→ Check logs di https://expo.dev atau terminal

### "APK tidak bisa install"
→ Enable "Install from Unknown Sources" di Android settings

---

## 📦 Recommended: EAS Build (Cloud)

**Keuntungan:**
- ✅ Tidak perlu Android Studio
- ✅ Tidak perlu setup environment
- ✅ Build di cloud (cepat)
- ✅ Free tier: 30 builds/month
- ✅ Automatic signing & optimization

**Cara tercepat:**
```bash
# 1. Buat akun Expo
npx expo register

# 2. Login
eas login

# 3. Build
eas build --platform android --profile preview

# 4. Download & Install APK
```

---

## 🔗 Useful Links

- Expo Dev: https://expo.dev
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Android Studio: https://developer.android.com/studio
- Expo Go: https://expo.dev/go

---

**Need Help?** Contact: nikforart@gmail.com
