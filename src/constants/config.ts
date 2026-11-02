export const API_URL = 'https://coinlab-backend-production.up.railway.app';
// Web OAuth client. Used for the web redirect flow and as `webClientId` for
// native Google Sign-In. Android additionally needs an Android OAuth client
// (package name + SHA-1) in the same Google Cloud project; it isn't referenced here.
export const GOOGLE_WEB_CLIENT_ID = '635281390211-uosidnt9iul2djhupts3u2r87ckhtr2a.apps.googleusercontent.com';
export const APP_SCHEME = 'coinlabmobile';

/** A legal page served by the backend, in the app's language. */
export const legalPageUrl = (page: 'privacy' | 'terms' | 'delete-account', language: 'tr' | 'en') =>
  `${API_URL}/${page}?lang=${language}`;
export const PRIVACY_POLICY_URL = (language: 'tr' | 'en') => legalPageUrl('privacy', language);
export const TERMS_URL = (language: 'tr' | 'en') => legalPageUrl('terms', language);
