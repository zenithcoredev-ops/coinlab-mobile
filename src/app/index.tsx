import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL } from '@/constants/config';
import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import { deviceTimeZone } from '@/lib/timezone';
import { consumeGoogleRedirect, describeGoogleError, GoogleAccount, signInWithGoogle } from '@/services/google-auth';
import { theme } from '@/theme';

export default function SignInScreen() {
  const { t } = useI18n();
  const { ready, signIn } = useSession();
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Finish a web OAuth redirect if one is in flight.
  useEffect(() => {
    (async () => {
      try {
        const account = await consumeGoogleRedirect();
        if (account) await completeSignIn(account);
      } catch (e) {
        setError(describeGoogleError(e, t));
      } finally {
        setBootstrapping(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onGooglePress() {
    setLoading(true);
    setError(null);
    try {
      const account = await signInWithGoogle();
      if (account) await completeSignIn(account);
    } catch (e) {
      setError(describeGoogleError(e, t));
    } finally {
      setLoading(false);
    }
  }

  async function completeSignIn(account: GoogleAccount) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          providerToken: account.accessToken,
          email: account.email,
          name: account.name,
          timezone: deviceTimeZone() ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.token) {
        await signIn({ token: data.token, name: data.user?.name ?? t('signin.defaultName') });
      } else {
        setError(t('signin.failed', { detail: data?.error ?? JSON.stringify(data) }));
      }
    } catch (e: any) {
      setError(t('signin.error', { detail: e.message }));
    } finally {
      setLoading(false);
    }
  }

  if (!ready || bootstrapping) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator color={theme.colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('signin.title')}</Text>
        <Text style={styles.subtitle}>{t('signin.subtitle')}</Text>

        <TouchableOpacity style={styles.button} disabled={loading} onPress={onGooglePress}>
          {loading ? (
            <ActivityIndicator color={theme.colors.accentInk} />
          ) : (
            <Text style={styles.buttonText}>{t('signin.google')}</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: theme.fontSizes.xxl + 4,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md + 2,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xxl + 8,
  },
  button: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.lg - 2,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    minWidth: 240,
    alignItems: 'center',
  },
  buttonText: { color: theme.colors.accentInk, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md + 2 },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, marginTop: theme.spacing.lg, textAlign: 'center' },
});
