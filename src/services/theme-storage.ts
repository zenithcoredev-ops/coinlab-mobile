import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeName } from '@/constants/theme';

const THEME_STORAGE_KEY = 'coinlab_theme';

export async function loadStoredTheme(): Promise<ThemeName | null> {
  try {
    const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

export async function saveStoredTheme(theme: ThemeName) {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
}
