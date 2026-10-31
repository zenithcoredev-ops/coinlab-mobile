import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { ProgressRing } from '@/components/progress-ring';
import { RateBreakdownModal } from '@/components/rate-breakdown-modal';
import { ScreenHeader } from '@/components/screen-header';
import { useMining } from '@/context/mining';
import { useNow } from '@/hooks/use-now';
import { useStartMining } from '@/hooks/use-start-mining';
import { useI18n } from '@/i18n';
import { formatClb, formatDuration, isStreakAtRisk, streakDayIsLocal, liveBalanceAt, remainingSinceFetch, sessionProgress } from '@/lib/mining-math';
import { MINING_SESSION_MS } from '@/services/mining-api';
import { theme } from '@/theme';

export default function MineScreen() {
  const { t } = useI18n();
  const { status, fetchedAt, error, starting, refresh } = useMining();
  const now = useNow(1000);
  const [rateOpen, setRateOpen] = useState(false);

  const sinceFetch = fetchedAt ? now - fetchedAt : 0;
  const session = status?.session ?? null;
  const remainingMs = remainingSinceFetch(status, sinceFetch);
  const isMining = remainingMs > 0;
  const startMining = useStartMining(!!status && !isMining);
  const boosted = (status?.thsBreakdown.ads ?? 0) > 0;
  const ths = status?.currentThs ?? 0;
  const balance = liveBalanceAt(status, sinceFetch);
  const durationMs = session ? Math.max(1, Date.parse(session.endsAt) - Date.parse(session.startedAt)) : MINING_SESSION_MS;
  const progress = isMining ? sessionProgress(remainingMs, durationMs) : 0;

  // The session just ran out locally: pull the settled balance from the server.
  const expired = !!session && remainingMs === 0;
  useEffect(() => {
    if (expired) refresh();
  }, [expired, refresh]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = isMining ? withRepeat(withTiming(0.55, { duration: 800 }), -1, true) : 1;
  }, [isMining, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const ringColor = boosted ? theme.colors.accent : theme.colors.positive;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader />

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('mine.balance')}</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>{formatClb(balance)}</Text>
            <Text style={styles.balanceUnit}>{t('mine.clb')}</Text>
          </View>
          <View style={styles.balanceSub}>
            <Text style={[styles.rateText, isMining && { color: ringColor }]}>
              {isMining ? t('mine.rateActive', { ths: ths.toFixed(2) }) : t('mine.rateStopped')}
            </Text>
            <Pressable onPress={() => setRateOpen(true)} hitSlop={12} accessibilityLabel={t('rate.title')}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.mineZone}>
          <ProgressRing progress={progress} color={ringColor}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isMining || starting || !status}
              onPress={startMining}
              style={[styles.core, isMining ? styles.coreActive : styles.coreIdle]}
              accessibilityRole="button"
              accessibilityLabel={isMining ? t('mine.active') : t('mine.start')}>
              {starting || (!status && !error) ? (
                <ActivityIndicator color={isMining ? theme.colors.text : theme.colors.accentInk} />
              ) : isMining ? (
                <>
                  <Animated.View style={pulseStyle}>
                    <Ionicons name="hammer" size={30} color={theme.colors.text} />
                  </Animated.View>
                  <Text style={styles.coreActiveLabel}>{t('mine.active')}</Text>
                  <Text style={[styles.coreRate, { color: ringColor }]}>{ths.toFixed(2)} Th/s</Text>
                </>
              ) : (
                <>
                  <Ionicons name="hammer" size={34} color={theme.colors.accentInk} />
                  <Text style={styles.coreIdleLabel}>{t('mine.startLabel')}</Text>
                </>
              )}
            </TouchableOpacity>
          </ProgressRing>

          <Text style={styles.status}>
            {isMining ? t('mine.timeLeftValue', { time: formatDuration(remainingMs) }) : t('mine.tapToStart')}
          </Text>
          {status && isStreakAtRisk(status) && !isMining ? (
            <Text style={styles.streakWarning}>{t(streakDayIsLocal(status) ? 'streak.atRiskLocal' : 'streak.atRisk', { count: status.streak })}</Text>
          ) : null}
          {!!error || (!status && !!error) ? (
            <Text style={styles.error}>{error || t('mine.statusFailed')}</Text>
          ) : null}
        </View>
      </ScrollView>

      <RateBreakdownModal
        visible={rateOpen}
        breakdown={status?.thsBreakdown ?? null}
        total={ths}
        onClose={() => setRateOpen(false)}
      />
    </SafeAreaView>
  );
}

const { size: ringSize, coreSize } = theme.ring;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  balanceCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl - 2,
  },
  balanceLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm },
  balanceValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.fontSizes.xxl,
    fontVariant: ['tabular-nums'],
  },
  balanceUnit: { color: theme.colors.accent, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.md },
  balanceSub: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.sm },
  rateText: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm - 0.5 },
  mineZone: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xxl + 8 },
  core: {
    width: coreSize,
    height: coreSize,
    borderRadius: coreSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: theme.spacing.sm,
  },
  coreIdle: { backgroundColor: theme.colors.coreIdle },
  coreActive: { backgroundColor: theme.colors.coreActive },
  coreIdleLabel: {
    color: theme.colors.accentInk,
    fontFamily: theme.fonts.display,
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
  },
  coreActiveLabel: { color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.xs },
  coreRate: { fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.md },
  status: {
    marginTop: theme.spacing.xl,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
    width: ringSize + 60,
  },
  streakWarning: {
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
});
