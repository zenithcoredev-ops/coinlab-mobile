const en = {
  'tabs.mine': 'Mine',
  'tabs.tasks': 'Tasks',
  'tabs.friends': 'Friends',
  'tabs.profile': 'Profile',

  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.retry': 'Try again',
  'common.unknownError': 'Something went wrong',
  'common.requestFailed': 'Request failed ({status})',

  'signin.title': 'CoinLab',
  'signin.subtitle': 'Sign in to start earning',
  'signin.google': 'Sign in with Google',
  'signin.failed': 'Sign-in failed: {detail}',
  'signin.error': 'Error: {detail}',
  'signin.alreadyInProgress': 'Sign-in is already in progress',
  'signin.playServices': 'Google Play Services is missing or out of date',
  'signin.developerError':
    'Google configuration error: check the package name and SHA-1 of the Android OAuth client',
  'signin.defaultName': 'Miner',

  'mine.balance': 'Balance',
  'mine.clb': 'CLB',
  'mine.speed': 'Speed',
  'mine.sessionTime': 'Session length',
  'mine.timeLeft': 'Time left',
  'mine.start': 'Start mining',
  'mine.active': 'Mining',
  'mine.noSession': 'No session. Sign in again.',
  'mine.statusFailed': 'Could not load status',
  'mine.startFailed': 'Could not start mining',
  'mine.sessionExpired': 'No session found, please sign in again',
  'mine.startLabel': 'START\nMINING',
  'mine.tapToStart': 'Tap to start your daily mining',
  'mine.timeLeftValue': 'Time left {time}',
  'mine.rateActive': 'Mining at {ths} Th/s',
  'mine.rateStopped': 'Mining stopped',

  'rate.title': 'Your mining speed',
  'rate.base': 'Base speed',
  'rate.friends': 'Friends bonus',
  'rate.steps': 'Steps bonus',
  'rate.league': 'League bonus',
  'rate.ads': 'Active ad boosts',
  'rate.total': 'Total',

  'streak.days_one': '{count} day',
  'streak.days_other': '{count} days',

  'placeholder.soon': 'Coming soon',
} as const;

export type TranslationKey = keyof typeof en;
/** `foo` for every `foo_one`/`foo_other` pair; pass `{ count }` to pick the form. */
export type PluralKey = TranslationKey extends infer K ? (K extends `${infer B}_one` ? B : never) : never;
export default en;
