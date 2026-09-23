import { API_URL } from '@/constants/config';
import { loadStoredAuth, saveStoredAuth } from '@/services/auth-storage';
import {
  consumeGoogleRedirect,
  describeGoogleError,
  GoogleAccount,
  signInWithGoogle,
} from '@/services/google-auth';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Finish a web OAuth redirect if one is in flight; otherwise restore a saved
  // session so the app doesn't show the sign-in screen again after a reload.
  useEffect(() => {
    (async () => {
      try {
        const account = await consumeGoogleRedirect();
        if (account) {
          setBootstrapping(false);
          await completeSignIn(account);
          return;
        }
      } catch (e) {
        setError(describeGoogleError(e));
        setBootstrapping(false);
        return;
      }

      const stored = await loadStoredAuth();
      if (stored) {
        router.replace({ pathname: '/dashboard', params: { name: stored.name } });
        return;
      }

      setBootstrapping(false);
    })();
  }, []);

  async function onGooglePress() {
    setLoading(true);
    setError(null);
    try {
      const account = await signInWithGoogle();
      if (account) await completeSignIn(account);
    } catch (e) {
      setError(describeGoogleError(e));
    } finally {
      setLoading(false);
    }
  }

  async function completeSignIn(account: GoogleAccount) {
    setLoading(true);
    setError(null);
    try {
      const signinRes = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          providerToken: account.accessToken,
          email: account.email,
          name: account.name,
        }),
      });
      const data = await signinRes.json();

      if (data.token) {
        const name = data.user?.name ?? 'Kullanici';
        await saveStoredAuth({ token: data.token, name });
        router.replace({ pathname: '/dashboard', params: { name } });
      } else {
        setError('Giris basarisiz: ' + JSON.stringify(data));
      }
    } catch (e: any) {
      setError('Hata: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>CoinLab</Text>
        <Text style={styles.subtitle}>Kazanmaya baslamak icin giris yap</Text>

        <TouchableOpacity
          style={styles.button}
          disabled={loading}
          onPress={onGooglePress}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Google ile Giris Yap</Text>}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9CA3AF', marginBottom: 40 },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 240,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#EF4444', marginTop: 16, textAlign: 'center' },
});
