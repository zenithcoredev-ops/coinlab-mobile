import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'coinlab_auth';
const REFRESH_ATTEMPT_KEY = 'coinlab_token_refresh_attempt';

export type StoredAuth = {
  token: string;
  name: string;
  /** Device time (ms) the token was received; missing for sessions saved by older builds. */
  issuedAt?: number;
};

export async function loadStoredAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.token !== 'string' || typeof parsed?.name !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveStoredAuth(auth: StoredAuth) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export async function clearStoredAuth() {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}

/** When a token refresh was last attempted (ms), or null. */
export async function loadRefreshAttempt(): Promise<number | null> {
  try {
    const value = Number(await AsyncStorage.getItem(REFRESH_ATTEMPT_KEY));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function saveRefreshAttempt(at: number) {
  await AsyncStorage.setItem(REFRESH_ATTEMPT_KEY, String(at)).catch(() => {});
}
