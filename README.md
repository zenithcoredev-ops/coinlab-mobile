# CoinLab Mobile

CoinLab'in Expo (React Native) mobil uygulaması. Kullanıcı Google ile giriş yapar, günde bir kez 24 saatlik toplama oturumu başlatır ve CLB puanını, toplama hızını (CLB/saat), serisini, görevlerini, ligini ve arkadaşlarını takip eder. Android ana ekran widget'ı saat, hava durumu, günlük adım ve toplama durumunu gösterir.

CLB uygulama içi bir puandır; parasal değeri yoktur, paraya çevrilemez.

## Ekranlar

| Rota | Dosya | Açıklama |
|---|---|---|
| `/` | `src/app/index.tsx` | Google ile giriş; kayıtlı oturum varsa sekmelere yönlendirir. |
| `/onboarding` | `src/app/onboarding.tsx` | İlk açılış tanıtımı ve davet kodu. |
| Topla | `src/app/(tabs)/index.tsx` | "Toplamayı başlat" düğmesi, kalan süre, canlı CLB bakiyesi, hız dökümü, adım kartı, isteğe bağlı reklam takviyesi. |
| Görevler | `src/app/(tabs)/tasks.tsx` | Günlük görevler ve ödülleri. |
| Lig | `src/app/(tabs)/league.tsx` | Haftalık lig, sıralama ve Elmas Turnuvası. |
| Arkadaşlar | `src/app/(tabs)/friends.tsx` | Davet kodu ve arkadaş bonusları. |
| Profil | `src/app/(tabs)/profile.tsx` | Rozetler, ödüller, dil, bildirimler, widget ayarları, yasal bağlantılar, hesap silme. |

## Kurulum ve çalıştırma

```bash
npm install
npx expo start        # development build ile
npm run android       # Android emulator
npm run ios           # iOS simulator (macOS)
npm run web           # tarayıcıda
```

`npm install`, `patches/` altındaki yamaları `patch-package` ile uygular.

## Proje yapısı

```
src/
  app/          Expo Router rotaları (giriş, tanıtım, sekmeler)
  components/   Kartlar, modallar ve ortak arayüz parçaları
  context/      Oturum, toplama durumu, adımlar, bildirimler, reklam onayı
  hooks/        Canlı bakiye, seri hatırlatması, widget eşitleme vb.
  i18n/         TR/EN metinler (tr.ts, en.ts)
  lib/          Saf hesaplar ve biçimlendirme (hız, süre, sayılar, lig, seri)
  services/     Backend istemcileri, Health Connect, bildirimler
  widget/       Android ana ekran widget'ı
  ads/          AdMob yapılandırması, onay, geçiş ve ödüllü reklamlar
```

## Backend

Adres `src/constants/config.ts` içindeki `API_URL` değeridir (`https://coinlab-backend-production.up.railway.app`). Giriş `POST /auth/signin` ile yapılır; diğer istekler `Authorization: Bearer <token>` başlığıyla gönderilir. İstemciler `src/services/*-api.ts` dosyalarındadır.

### Hız ve sayılar

- Sunucu hızı kendi biriminde gönderir; uygulama bunu saatte toplanan CLB'ye çevirerek gösterir. 1 birim 24 saatte 2,4 CLB toplar, yani **1,00 = 0,10 CLB/saat** (`src/lib/` içindeki `CLB_PER_HOUR_PER_UNIT` ve `formatRate`).
- Bakiye, çalışan oturumun sunucudaki son değerinden yerel olarak saniye saniye artırılır; her yenilemede sunucunun değeri geçerlidir.
- Ondalık sayılar uygulama diline göre yazılır: TR'de virgül (`16,29171 CLB`, `0,10 CLB/saat`), EN'de nokta (`formatDecimal`).

## Test ve tip kontrolü

```bash
npx tsc --noEmit
npm test
```

GitHub Actions (`.github/workflows/ci.yml`), `main`'e gelen push ve PR'larda tip kontrolü ve testleri çalıştırır. `expo-env.d.ts` `.gitignore`'da olduğu için (Expo onu `expo start` sırasında üretir) CI bu dosyayı tip kontrolünden önce kendisi oluşturur.

## Bilinen notlar

- **Codespaces'te Metro dosya değişikliklerini görmeyebilir.** Değişiklik ekrana yansımıyorsa sunucuyu `npx expo start --clear` ile yeniden başlat.
