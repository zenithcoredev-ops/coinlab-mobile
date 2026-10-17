import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NotificationsProvider } from '@/context/notifications';
import { SessionProvider } from '@/context/session';
import { I18nProvider } from '@/i18n';
import { fontAssets, theme } from '@/theme';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.tabBar,
    text: theme.colors.text,
    primary: theme.colors.accent,
    border: theme.colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <I18nProvider>
      <NotificationsProvider>
        <SessionProvider>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </ThemeProvider>
        </SessionProvider>
      </NotificationsProvider>
    </I18nProvider>
  );
}
