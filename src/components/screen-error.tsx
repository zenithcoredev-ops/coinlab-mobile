import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { theme } from '@/theme';

/** Dev and test (preview) builds show what went wrong; store builds don't. */
export const showErrorDetails = () => __DEV__ || process.env.EXPO_PUBLIC_SHOW_ERRORS === '1';

/** The error, cut to one short line for the screen. */
export function shortError(error: unknown): string {
  const e = error instanceof Error ? error : new Error(String(error));
  const text = `${e.name}: ${e.message}`.replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

/**
 * What a tab shows when its screen throws while drawing: the app stays open, the other tabs keep
 * working, and "Tekrar dene" draws the screen again. Each tab route exports it as its `ErrorBoundary`.
 */
export function ScreenError({ error, retry }: ErrorBoundaryProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.box} testID="screen-error">
        <Ionicons name="alert-circle-outline" size={40} color={theme.colors.danger} />
        <Text style={styles.title}>{t('error.screen.title')}</Text>
        <Text style={styles.body}>{t('error.screen.body')}</Text>
        {showErrorDetails() ? (
          <Text style={styles.detail} selectable testID="screen-error-detail">
            {shortError(error)}
          </Text>
        ) : null}
        <Button
          label={t('common.retry')}
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await retry();
            } finally {
              setBusy(false);
            }
          }}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgDeep },
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg, textAlign: 'center' },
  body: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, textAlign: 'center', lineHeight: 19 },
  detail: { color: theme.colors.danger, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs, textAlign: 'center' },
  button: { marginTop: theme.spacing.md, alignSelf: 'stretch' },
});
