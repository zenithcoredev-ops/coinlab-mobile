import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadStoredAuth } from '@/services/auth-storage';
import {
  getMiningStatus,
  liveBalance,
  MINING_SESSION_MS,
  MiningStatus,
  startMining,
  USE_MOCK_MINING,
} from '@/services/mining-api';
import { Palette } from '@/constants/theme';
import { useAppTheme } from '@/context/app-theme';

export default function Dashboard() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { name } = useLocalSearchParams<{ name?: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const refreshingRef = useRef(false);

  const refresh = useCallback(async (authToken: string) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      setStatus(await getMiningStatus(authToken));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Durum alinamadi');
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const auth = await loadStoredAuth();
      if (!auth) {
        setError('Oturum bulunamadi, lutfen tekrar giris yap');
        return;
      }
      setToken(auth.token);
      refresh(auth.token);
    })();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const endsAtMs = status?.endsAt ? Date.parse(status.endsAt) : null;
  const remainingMs = status?.isActive && endsAtMs ? Math.max(0, endsAtMs - now) : 0;
  const isMining = remainingMs > 0;

  // When the session runs out, fetch the settled balance from the source.
  useEffect(() => {
    if (token && status?.isActive && remainingMs === 0) refresh(token);
  }, [token, status?.isActive, remainingMs, refresh]);

  async function onStart() {
    if (!token) return;
    setStarting(true);
    setError(null);
    try {
      setStatus(await startMining(token));
    } catch (e: any) {
      setError(e.message ?? 'Kazim baslatilamadi');
    } finally {
      setStarting(false);
    }
  }

  const balance = status ? liveBalance(status, now) : 0;
  const hashrate = isMining ? (status?.hashrateThs ?? 0) : 0;
  const progress = isMining ? 1 - remainingMs / MINING_SESSION_MS : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hos geldin {name}</Text>
        <View style={styles.headerActions}>
          {USE_MOCK_MINING && <Text style={styles.mockBadge}>Demo veri</Text>}
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel="Ayarlar">
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>CLB Puani</Text>
          <Text style={styles.statValue}>{balance.toFixed(4)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Hiz</Text>
          <Text style={styles.statValue}>
            {hashrate.toFixed(2)} <Text style={styles.statUnit}>Th/s</Text>
          </Text>
        </View>
      </View>

      <View style={styles.center}>
        <Text style={styles.countdownLabel}>{isMining ? 'Kalan sure' : 'Oturum suresi'}</Text>
        <Text style={styles.countdown}>{formatDuration(isMining ? remainingMs : MINING_SESSION_MS)}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {status === null && !error ? (
          <ActivityIndicator color={colors.text} style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={[styles.button, (isMining || starting || !token) && styles.buttonDisabled]}
            disabled={isMining || starting || !token}
            onPress={onStart}>
            {starting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>{isMining ? 'Kazim Aktif' : 'Kazimi Baslat'}</Text>
            )}
          </TouchableOpacity>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 24 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingsIcon: { color: c.mutedText, fontSize: 22 },
    greeting: { color: c.text, fontSize: 22, fontWeight: 'bold', flexShrink: 1 },
    mockBadge: {
      color: c.warning,
      fontSize: 12,
      borderColor: c.warning,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    statsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: 16, padding: 16 },
    statLabel: { color: c.mutedText, fontSize: 13, marginBottom: 6 },
    statValue: { color: c.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
    statUnit: { color: c.mutedText, fontSize: 14, fontWeight: '500' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    countdownLabel: { color: c.mutedText, fontSize: 14, marginBottom: 8 },
    countdown: { color: c.text, fontSize: 48, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
    progressTrack: {
      width: '80%',
      height: 6,
      backgroundColor: c.track,
      borderRadius: 3,
      marginTop: 16,
      marginBottom: 40,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: c.primary },
    loader: { height: 56 },
    button: {
      backgroundColor: c.primary,
      paddingVertical: 18,
      paddingHorizontal: 40,
      borderRadius: 16,
      minWidth: 240,
      alignItems: 'center',
    },
    buttonDisabled: { backgroundColor: c.primaryDisabled },
    buttonText: { color: c.onPrimary, fontSize: 18, fontWeight: '700' },
    error: { color: c.error, marginTop: 16, textAlign: 'center' },
  });
}
