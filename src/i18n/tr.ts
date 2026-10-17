import type { TranslationKey } from './en';

const tr: Record<TranslationKey, string> = {
  'tabs.mine': 'Kazım',
  'tabs.tasks': 'Görevler',
  'tabs.friends': 'Arkadaşlar',
  'tabs.profile': 'Profil',

  'common.loading': 'Yükleniyor…',
  'common.retry': 'Tekrar dene',
  'common.unknownError': 'Bir şeyler ters gitti',
  'common.requestFailed': 'İstek başarısız ({status})',

  'signin.title': 'CoinLab',
  'signin.subtitle': 'Kazanmaya başlamak için giriş yap',
  'signin.google': 'Google ile giriş yap',
  'signin.failed': 'Giriş başarısız: {detail}',
  'signin.error': 'Hata: {detail}',
  'signin.alreadyInProgress': 'Giriş zaten devam ediyor',
  'signin.playServices': 'Google Play Hizmetleri bulunamadı veya güncel değil',
  'signin.developerError':
    'Google yapılandırma hatası: Android OAuth istemcisinin paket adını ve SHA-1 değerini kontrol et',
  'signin.defaultName': 'Madenci',

  'mine.balance': 'Bakiye',
  'mine.clb': 'CLB',
  'mine.speed': 'Hız',
  'mine.sessionTime': 'Oturum süresi',
  'mine.timeLeft': 'Kalan süre',
  'mine.start': 'Kazımı başlat',
  'mine.active': 'Kazım aktif',
  'mine.noSession': 'Oturum yok. Tekrar giriş yap.',
  'mine.statusFailed': 'Durum alınamadı',
  'mine.startFailed': 'Kazım başlatılamadı',
  'mine.sessionExpired': 'Oturum bulunamadı, lütfen tekrar giriş yap',

  'placeholder.soon': 'Çok yakında',
};

export default tr;
