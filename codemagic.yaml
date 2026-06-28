# Domniot App

ESP32 tabanlı bitki izleme uygulaması — React + Capacitor ile Android APK.

## 🚀 Codemagic ile APK Yapma (Önerilen)

### 1. GitHub'a yükle
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI_ADIN/domniot.git
git push -u origin main
```

### 2. Codemagic'te ayarla
1. [codemagic.io](https://codemagic.io) → **Add application** → GitHub repon
2. **Environment variables** panelinden ekle:
   - `GEMINI_API_KEY` = Gemini API anahtarın
3. **Start build** → `android-release` workflow'unu seç
4. Build bittikten sonra APK indir!

### 3. Yerel geliştirme (opsiyonel)
```bash
npm install
npm run build
npx cap add android      # ilk seferinde
npx cap sync android
npx cap open android     # Android Studio açar
```

## ⚠️ Önemli Notlar

- **ESP32 HTTP bağlantısı**: `capacitor.config.ts` içinde `cleartext: true` ayarlı — lokal ağda HTTP çalışır.
- **Gemini API Key**: `.env` dosyasına ekle (git'e commit etme!).
- **Kamera**: Android'de kamera izni otomatik istenir.

## 📁 Proje Yapısı

```
├── src/
│   ├── App.tsx          # Ana uygulama
│   ├── services/
│   │   └── espService.ts # ESP32 API servisi
│   ├── types.ts
│   └── translations.ts
├── capacitor.config.ts  # Capacitor ayarları
├── codemagic.yaml       # CI/CD pipeline
└── vite.config.ts       # Build ayarları
```
