import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'coinlab_auth';

export type StoredAuth = {
  token: string;
  name: string;
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
