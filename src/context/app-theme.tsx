import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { Palette, palettes, ThemeName } from '@/constants/theme';
import { loadStoredTheme, saveStoredTheme } from '@/services/theme-storage';

type AppTheme = {
  theme: ThemeName;
  colors: Palette;
  setTheme: (theme: ThemeName) => void;
};

const AppThemeContext = createContext<AppTheme | null>(null);

// The app was dark-only before the toggle existed, so dark stays the default.
const DEFAULT_THEME: ThemeName = 'dark';

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    loadStoredTheme().then((stored) => {
      if (stored) setThemeState(stored);
    });
  }, []);

  function setTheme(next: ThemeName) {
    setThemeState(next);
    saveStoredTheme(next).catch(() => {});
  }

  return (
    <AppThemeContext.Provider value={{ theme, colors: palettes[theme], setTheme }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return ctx;
}
