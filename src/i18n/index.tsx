import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { dictionaries, Language, Translate, translate } from './translate';
import type { PluralKey, TranslationKey } from './en';

/** What the user picked in Profile; 'auto' follows the device. */
export type LanguagePreference = 'auto' | Language;

const LANGUAGE_STORAGE_KEY = 'coinlab_language';

export function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
}

export function resolveLanguage(preference: LanguagePreference, device: Language): Language {
  return preference === 'auto' ? device : preference;
}

type I18n = {
  language: Language;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  t: Translate;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('auto');
  const [device, setDevice] = useState<Language>(deviceLanguage);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((raw) => {
        if (raw === 'en' || raw === 'tr' || raw === 'auto') setPreferenceState(raw);
      })
      .catch(() => {});
  }, []);

  // Android lets the user change the system language without restarting the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDevice(deviceLanguage());
    });
    return () => sub.remove();
  }, []);

  const setPreference = useCallback((next: LanguagePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => {});
  }, []);

  const language = resolveLanguage(preference, device);
  const value = useMemo<I18n>(
    () => ({
      language,
      preference,
      setPreference,
      t: (key, params) => translate(language, key, params),
    }),
    [language, preference, setPreference]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
export type { Language, PluralKey, Translate, TranslationKey };
