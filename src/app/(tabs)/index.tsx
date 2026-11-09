import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBoostCard } from '@/components/ad-boost-card';
import { CollectRing, RING_SIZE } from '@/components/home/collect-ring';
import { DailyTasksCard, LeagueMiniCard, StepsMiniCard, TodayStrip } from '@/components/home/home-cards';
import { NeonCard } from '@/components/neon-card';
import { ScanLight, ScreenBackground } from '@/components/home/screen-background';
import { RateBreakdownModal } from '@/components/rate-breakdown-modal';
import { ScreenHeader } from '@/components/screen-header';
import { useMining } from '@/context/mining';
import { useAmbientMotion } from '@/hooks/use-ambient-motion';
import { useNow } from '@/hooks/use-now';
import { useStartMining } from '@/hooks/use-start-mining';
import { useI18n } from '@/i18n';
import {
  formatClb,
  formatClbPerHour,
  formatDuration,
  isStreakAtRisk,
  liveBalanceAt,
  liveCollectedTodayAt,
  remainingSinceFetch,
  sessionProgress,
  statusClbPerHour,
  streakDayIsLocal,
} from '@/lib/mining-math';
import { MINING_SESSION_MS } from '@/services/mining-api';
import { theme } from '@/theme';

// If this screen throws while drawing, the tab shows a retry screen instead of the app closing.
export { ScreenError as ErrorBoundary } from '@/components/screen-error';

const RING_PAD = theme.spacing.xl;

export default function MineScreen() {
  const { t, language } = useI18n();
  const { status, fetchedAt, error, starting, refresh } = useMining();
  const now = useNow(1000);
  const [rateOpen, setRateOpen] = useState(false);
  const animate = useAmbientMotion();
  const { width } = useWindowDimensions();
  const [ringTop, setRingTop] = useState<number | null>(null);

  const sinceFetch = fetchedAt ? now - fetchedAt : 0;
  const session = status?.session ?? null;
  const remainingMs = remainingSinceFetch(status, sinceFetch);
  const isMining = remainingMs > 0;
  const startMining = useStartMining(!!status && !isMining);
  const balance = liveBalanceAt(status, sinceFetch);
  // Same tick as the balance.
  const collectedToday = liveCollectedTodayAt(status, fetchedAt, now);
  const durationMs = session ? Math.max(1, Date.parse(session.endsAt) - Date.parse(session.startedAt)) : MINING_SESSION_MS;
  const progress = isMining ? sessionProgress(remainingMs, durationMs) : 0;
  const rate = formatClbPerHour(statusClbPerHour(status), language);

  // The session just ran out locally: pull the settled balance from the server.
  const expired = !!session && remainingMs === 0;
  useEffect(() => {
    if (expired) refresh();
  }, [expired, refresh]);

  // Where the ring's centre is inside the scrolling content, for the turquoise lines around it.
  const focus = useMemo(() => (ringTop === null ? null : { x: width / 2, y: ringTop + RING_PAD + RING_SIZE / 2 }), [ringTop, width]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenBackground variant="neon" focus={focus} focusRadius={RING_SIZE / 2} />
        <ScreenHeader />

        <NeonCard grid testID="balance-card">
          <Text style={styles.balanceLabel}>{t('mine.balance')}</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue} adjustsFontSizeToFit numberOfLines={1}>
              {formatClb(balance, language)}
            </Text>
            <Text style={styles.balanceUnit}>{t('mine.clb')}</Text>
          </View>
          <View style={styles.balanceSub}>
            <Text style={[styles.rateText, isMining && styles.rateActive]}>{isMining ? t('mine.rateActive', { rate }) : t('mine.rateStopped')}</Text>
            <Pressable onPress={() => setRateOpen(true)} hitSlop={12} accessibilityLabel={t('rate.title')}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.tabInactive} />
            </Pressable>
          </View>
        </NeonCard>

        <View style={styles.mineZone} onLayout={(e) => setRingTop(e.nativeEvent.layout.y)}>
          <CollectRing
            progress={progress}
            collecting={isMining}
            rate={`${rate} ${t('unit.rate')}`}
            busy={starting || (!status && !error)}
            disabled={isMining || starting || !status}
            onStart={startMining}
            animate={animate}
          />

          {isMining ? (
            <View style={styles.timeLeft}>
              <Text style={styles.timeLeftLabel}>{t('mine.timeLeft')}</Text>
              <Text style={styles.timeLeftValue} accessibilityLabel={t('mine.timeLeftValue', { time: formatDuration(remainingMs) })}>
                {formatDuration(remainingMs)}
              </Text>
            </View>
          ) : (
            <Text style={styles.status}>{t('mine.tapToStart')}</Text>
          )}
          {status && isStreakAtRisk(status) && !isMining ? (
            <Text style={styles.streakWarning}>{t(streakDayIsLocal(status) ? 'streak.atRiskLocal' : 'streak.atRisk', { count: status.streak })}</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error || t('mine.statusFailed')}</Text> : null}
        </View>

        <TodayStrip collectedToday={collectedToday} />

        <View style={styles.pair}>
          <StepsMiniCard />
          <LeagueMiniCard balance={balance} />
        </View>

        <AdBoostCard />
        <DailyTasksCard />
      </ScrollView>

      <ScanLight animate={animate} />

      <RateBreakdownModal visible={rateOpen} status={status ?? null} onClose={() => setRateOpen(false)} />
    </SafeAreaView>
  );
}

// Glow only on titles and big numbers, always behind the text.
const greenGlow = { textShadowColor: theme.colors.neonGlow, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgDeep },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  balanceLabel: {
    color: theme.colors.tabInactive,
    fontFamily: theme.fonts.displayMedium,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm },
  balanceValue: {
    flexShrink: 1,
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
    fontSize: theme.fontSizes.xxl + 6,
    fontVariant: ['tabular-nums'],
    ...greenGlow,
  },
  balanceUnit: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.lg },
  balanceSub: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.sm },
  rateText: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm },
  rateActive: { color: theme.colors.neon },
  mineZone: { alignItems: 'center', justifyContent: 'center', paddingVertical: RING_PAD },
  timeLeft: { alignItems: 'center', marginTop: theme.spacing.lg },
  timeLeftLabel: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm },
  timeLeftValue: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl, fontVariant: ['tabular-nums'], marginTop: 2, ...greenGlow },
  status: {
    marginTop: theme.spacing.lg,
    color: theme.colors.tabInactive,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
  },
  // Long warnings wrap onto a second line instead of running off the screen.
  streakWarning: {
    alignSelf: 'stretch',
    flexShrink: 1,
    paddingHorizontal: theme.spacing.sm,
    lineHeight: 19,
    color: theme.colors.danger,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSizes.sm,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.body,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  pair: { flexDirection: 'row', gap: theme.spacing.md },
});
