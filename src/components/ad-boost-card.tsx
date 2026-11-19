import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { NeonCard } from '@/components/neon-card';
import { showErrorDetails } from '@/components/screen-error';
import { useRewardedBoost } from '@/hooks/use-rewarded-boost';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { activeBoostCount, activeBoostsClbPerHour, adBoostClbPerHour, formatClbPerHour, formatDuration } from '@/lib/mining-math';
import { theme } from '@/theme';

const MESSAGES: Record<NonNullable<ReturnType<typeof useRewardedBoost>['message']>, TranslationKey> = {
  granted: 'ads.boost.granted',
  pending: 'ads.boost.pending',
  rejected: 'ads.boost.rejected',
  noAd: 'ads.boost.noAd',
  error: 'ads.boost.error',
};

/** Collect screen: the optional "watch an ad for a speed boost" card. The reward is a speed boost only. */
export function AdBoostCard() {
  const { t, language } = useI18n();
  const { visible, closed, ads, limitReached, waitMs, canWatch, phase, message, grantedClbPerHour, failureCode, watch } = useRewardedBoost();
  const code = failureCode && showErrorDetails() ? <Text style={styles.code}>{failureCode}</Text> : null;
  if (closed) {
    // Turned out to be off on the server: say so instead of vanishing; hidden from the next visit on.
    return (
      <NeonCard style={styles.card} testID="ad-boost-closed">
        <Text style={styles.title}>{t('home.boost.title')}</Text>
        <Text style={styles.body}>{t('ads.boost.unavailable')}</Text>
        {code}
      </NeonCard>
    );
  }
  if (!visible || !ads) return null;

  const rate = (perHour: number) => formatClbPerHour(perHour, language);
  const perAd = adBoostClbPerHour(ads);
  const activeCount = activeBoostCount(ads);
  const activeRate = activeBoostsClbPerHour(ads);

  // Today's count sits on the button; only the limit or the wait gets its own line.
  const hint = limitReached ? t('ads.boost.limit') : waitMs > 0 ? t('ads.boost.wait', { time: formatDuration(waitMs) }) : null;
  const label = phase === 'verifying' ? t('ads.boost.verifying') : t('ads.boost.watchCount', { used: ads.usedToday, limit: ads.dailyLimit });

  // One line under the title at most: a fresh result first, then why the button waits, then what runs.
  const activeText =
    activeCount > 0
      ? activeRate !== null && activeRate > 0
        ? t('ads.boost.activeRate', { count: activeCount, rate: rate(activeRate) })
        : t('ads.boost.active', { count: activeCount })
      : null;
  const messageText = message
    ? message === 'granted' && grantedClbPerHour !== null
      ? t('ads.boost.grantedRate', { rate: rate(grantedClbPerHour) })
      : t(MESSAGES[message])
    : null;
  const sub = messageText ?? hint ?? activeText;
  const perAdText = perAd !== null ? t('ads.boost.perAd', { rate: rate(perAd) }) : null;

  // A one-line strip: "Hızını artır" and the watch button ("İzle · 0/6 ›").
  return (
    <NeonCard style={styles.strip} testID="ad-boost-card">
      <View style={styles.row}>
        <View style={styles.play}>
          <Ionicons name="play" size={14} color={theme.colors.neonInk} />
        </View>
        <View style={styles.texts} accessible accessibilityLabel={[t('home.boost.title'), t('ads.boost.body'), perAdText].filter(Boolean).join('. ')}>
          <Text style={styles.title} numberOfLines={1}>
            {t('home.boost.title')}
          </Text>
        </View>
        <Pressable
          onPress={watch}
          disabled={!canWatch}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: !canWatch, busy: phase === 'watching' }}
          style={({ pressed }) => [styles.button, !canWatch && styles.buttonDisabled, pressed && { opacity: 0.85 }]}>
          {/* The spinner only covers loading the ad; while the server confirms the reward the (disabled) button says so. */}
          {phase === 'watching' ? (
            <ActivityIndicator color={theme.colors.neonInk} />
          ) : (
            <>
              <Text style={styles.buttonText}>{label}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.neonInk} />
            </>
          )}
        </Pressable>
      </View>
      {sub && <Text style={messageText && message !== 'granted' ? styles.note : styles.hint}>{sub}</Text>}
      {message && message !== 'granted' ? code : null}
    </NeonCard>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.md },
  strip: { marginTop: theme.spacing.md, paddingVertical: theme.spacing.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  play: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.neon, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  texts: { flex: 1 },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },
  body: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginTop: 4, lineHeight: 17 },
  hint: { color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.xs },
  button: {
    flexDirection: 'row',
    gap: 2,
    minHeight: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.sm + 0.5 },
  code: { color: theme.colors.tabInactive, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.sm, marginTop: 4 },
  note: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.xs },
});
