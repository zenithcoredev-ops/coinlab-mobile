# CoinLab Mobile

CoinLab'in Expo (React Native) mobil uygulamasi. Kullanici Google ile giris yapar, 24 saatlik kazim oturumu baslatir ve CLB puanini ile kazim hizini (Th/s) takip eder. iOS, Android ve web'de calisir.

## Ekranlar

| Rota | Dosya | Aciklama |
|---|---|---|
| `/` | `src/app/index.tsx` | Google ile giris. Kayitli oturum varsa dogrudan dashboard'a yonlendirir. |
| `/dashboard` | `src/app/dashboard.tsx` | "Kazimi Baslat" butonu, 24 saatlik geri sayim, canli CLB puani ve Th/s hiz gostergesi. |

Navigasyon basliksiz bir `Stack` ile yapilir (`src/app/_layout.tsx`).

## Kurulum ve calistirma

```bash
npm install
npx expo start        # QR kod ile Expo Go / development build
npm run web           # tarayicida
npm run android       # Android emulator
npm run ios           # iOS simulator (macOS)
```

## Proje yapisi

```
src/
  app/                  Expo Router rotalari (giris, dashboard, kok layout)
  components/           Acilis animasyonu (animated-icon)
  constants/config.ts   Backend adresi, Google client ID, URL scheme
  services/
    auth-storage.ts     Oturumu (token, isim) AsyncStorage'da saklar
    mining-api.ts       Kazim API istemcisi + gecici sahte veri
```

## Backend

Backend adresi `src/constants/config.ts` icindeki `API_URL` degeridir (su an `https://coinlab-backend-production.up.railway.app`).

- **Giris:** `POST /auth/signin` Google access token'i ile cagrilir, donen `token` AsyncStorage'a `coinlab_auth` anahtariyla kaydedilir.
- **Kazim:** Diger istekler `Authorization: Bearer <token>` basligi ile gonderilir.

### Kazim ucnoktalari (henuz backend'de yok)

Dashboard su an **sahte veriyle** calisir: `src/services/mining-api.ts` icinde `USE_MOCK_MINING = true` ve ekranda "Demo veri" etiketi gorunur. Sahte oturum AsyncStorage'da saklanir; 12.5 Th/s hiz ve saatte 0.25 CLB kullanir.

Istemci, backend'in su iki ucnoktayi saglamasini bekler:

- `GET /mining/status`
- `POST /mining/start`: 24 saatlik oturumu baslatir; aktif oturum varsa yenisini acmadan mevcut durumu dondurur.

Ikisi de ayni yaniti dondurur:

```json
{
  "isActive": true,
  "startedAt": "2026-09-23T10:00:00.000Z",
  "endsAt": "2026-09-24T10:00:00.000Z",
  "balance": 12.5,
  "pointsPerHour": 0.25,
  "hashrateThs": 12.5
}
```

`balance`, calisan oturumun kazanci haric kesinlesmis puandir; uygulama anlik puani `pointsPerHour` ile kendisi hesaplar. Oturum bitince kazanilan puani `balance`'a eklemek backend'in isidir.

Ucnoktalar hazir olunca `USE_MOCK_MINING = false` yapmak yeterli. Yol veya alan adlari farkli olursa sadece `mining-api.ts` degisir.

## Tip kontrolu ve CI

```bash
npx tsc --noEmit
```

GitHub Actions (`.github/workflows/ci.yml`), `main`'e gelen push ve PR'larda tip kontrolu calistirir. `expo-env.d.ts` `.gitignore`'da oldugu icin (Expo onu `expo start` sirasinda uretir) CI bu dosyayi tip kontrolunden once kendisi olusturur.

## Bilinen notlar

- **Codespaces'te Metro dosya degisikliklerini gormeyebilir.** Degisiklik ekrana yansimiyorsa sunucuyu `npx expo start --clear` ile yeniden baslat.
