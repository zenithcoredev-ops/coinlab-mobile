import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, GOOGLE_CLIENT_ID } from '@/constants/config';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const AUTH_STORAGE_KEY = 'coinlab_auth';

type StoredAuth = {
  token: string;
  name: string;
};

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
    },
    discovery
  );

  // Restore a previously saved session so the app doesn't show the sign-in
  // screen again after a reload, unless a fresh OAuth redirect is in flight.
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web' && window.location.hash.includes('access_token=')) {
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

  // Native flow: expo-auth-session resolves the OAuth result via `response`.
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleToken(response.authentication?.accessToken);
    } else if (response?.type === 'error') {
      setError(response.error?.message ?? 'Giris hatasi');
    }
  }, [response]);

  // Web flow: Google redirects back with the access token in the URL hash.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return;

    const token = new URLSearchParams(hash.substring(1)).get('access_token');
    window.history.replaceState(null, '', window.location.pathname);
    if (token) handleGoogleToken(token);
  }, []);

  function startWebLogin() {
    const url =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=token' +
      `&scope=${encodeURIComponent('openid profile email')}`;
    window.location.href = url;
  }

  async function handleGoogleToken(accessToken?: string) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();

      const signinRes = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          providerToken: accessToken,
          email: userInfo.email,
          name: userInfo.name,
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
          disabled={!request || loading}
          onPress={() => (Platform.OS === 'web' ? startWebLogin() : promptAsync())}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Google ile Giris Yap</Text>}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

async function loadStoredAuth(): Promise<StoredAuth | null> {
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

async function saveStoredAuth(auth: StoredAuth) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
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
