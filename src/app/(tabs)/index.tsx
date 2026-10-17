import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import { ApiError } from '@/services/api';
import { getMiningStatus, liveBalance, MINING_SESSION_MS, MiningStatus, startMining } from '@/services/mining-api';
import { theme } from '@/theme';

// Re-poll while mining so accrued CLB and ad boosts stay current; the
// countdown itself ticks locally between polls (see `remainingMs` below).
const POLL_MS = 30_000;

export default function MineScreen() {
  const { t } = useI18n();
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const refreshingRef = useRef(false);

  const describe = useCallback(
    (e: unknown, fallbackKey: 'mine.statusFailed' | 'mine.startFailed') =>
      e instanceof ApiError && e.message ? e.message : t(fallbackKey),
    [t]
  );

  const refresh = useCallback(
    async (authToken: string) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        setStatus(await getMiningStatus(authToken));
        setFetchedAt(Date.now());
        setError(null);
      } catch (e) {
        setError(describe(e, 'mine.statusFailed'));
      } finally {
        refreshingRef.current = false;
      }
    },
    [describe]
  );

  useEffect(() => {
    if (token) refresh(token);
  }, [token, refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token || !status?.session) return;
    const id = setInterval(() => refresh(token), POLL_MS);
    return () => clearInterval(id);
  }, [token, status?.session, refresh]);

  const session = status?.session ?? null;
  // The server only gives us a snapshot of `remainingMs` at fetch time; tick it
  // down locally using elapsed wall-clock time since then, not the device clock's
  // absolute notion of "now".
  const elapsedSinceFetch = fetchedAt ? Math.max(0, now - fetchedAt) : 0;
  const remainingMs = session ? Math.max(0, session.remainingMs - elapsedSinceFetch) : 0;
  const isMining = remainingMs > 0;

  // When the session runs out, fetch the settled balance from the source.
  useEffect(() => {
    if (token && session && remainingMs === 0) refresh(token);
  }, [token, session, remainingMs, refresh]);

  async function onStart() {
    if (!token) return;
    setStarting(true);
    setError(null);
    try {
      setStatus(await startMining(token));
      setFetchedAt(Date.now());
    } catch (e) {
      setError(describe(e, 'mine.startFailed'));
    } finally {
      setStarting(false);
    }
  }

  const balance = status ? liveBalance(status) : 0;
  const hashrate = status?.currentThs ?? 0;
  const sessionDurationMs = session
    ? Math.max(1, Date.parse(session.endsAt) - Date.parse(session.startedAt))
    : MINING_SESSION_MS;
  const progress = isMining ? 1 - remainingMs / sessionDurationMs : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('mine.balance')}</Text>
          <Text style={styles.statValue}>{balance.toFixed(4)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('mine.speed')}</Text>
          <Text style={styles.statValue}>
            {hashrate.toFixed(2)} <Text style={styles.statUnit}>Th/s</Text>
          </Text>
        </View>
      </View>

      <View style={styles.center}>
        <Text style={styles.countdownLabel}>{isMining ? t('mine.timeLeft') : t('mine.sessionTime')}</Text>
        <Text style={styles.countdown}>{formatDuration(isMining ? remainingMs : sessionDurationMs)}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {status === null && !error ? (
          <ActivityIndicator color={theme.colors.text} style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={[styles.button, (isMining || starting || !token) && styles.buttonDisabled]}
            disabled={isMining || starting || !token}
            onPress={onStart}>
            {starting ? (
              <ActivityIndicator color={theme.colors.accentInk} />
            ) : (
              <Text style={styles.buttonText}>{isMining ? t('mine.active') : t('mine.start')}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.xl },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    marginBottom: 6,
  },
  statValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.fontSizes.xl,
    fontVariant: ['tabular-nums'],
  },
  statUnit: { color: theme.colors.textMuted, fontSize: theme.fontSizes.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  countdownLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    marginBottom: theme.spacing.sm,
  },
  countdown: {
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
    fontSize: 44,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: theme.colors.ringTrack,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxl + 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.colors.positive },
  loader: { height: 56 },
  button: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.lg + 2,
    paddingHorizontal: theme.spacing.xxl + 8,
    borderRadius: theme.radius.lg,
    minWidth: 240,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: theme.colors.accentDim },
  buttonText: { color: theme.colors.accentInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.body,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
});
