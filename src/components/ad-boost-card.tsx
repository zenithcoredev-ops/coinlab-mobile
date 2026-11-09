import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { NeonCard } from '@/components/home/neon-card';
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
  const { visible, ads, limitReached, waitMs, canWatch, phase, message, grantedClbPerHour, watch } = useRewardedBoost();
  if (!visible || !ads) return null;

  const rate = (perHour: number) => formatClbPerHour(perHour, language);
  const perAd = adBoostClbPerHour(ads);
  const activeCount = activeBoostCount(ads);
  const activeRate = activeBoostsClbPerHour(ads);

  // Today's count sits on the button; only the limit or the wait gets its own line.
  const hint = limitReached ? t('ads.boost.limit') : waitMs > 0 ? t('ads.boost.wait', { time: formatDuration(waitMs) }) : null;
  const label = phase === 'verifying' ? t('ads.boost.verifying') : t('ads.boost.watchCount', { used: ads.usedToday, limit: ads.dailyLimit });

  return (
    <NeonCard style={styles.card} testID="ad-boost-card">
      <View style={styles.row}>
        <View style={styles.play}>
          <Ionicons name="play" size={18} color={theme.colors.neonInk} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{t('home.boost.title')}</Text>
          <Text style={styles.body}>{t('ads.boost.body')}</Text>
        </View>
      </View>
      {perAd !== null && <Text style={styles.hint}>{t('ads.boost.perAd', { rate: rate(perAd) })}</Text>}
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {activeCount > 0 && (
        <Text style={styles.hint}>
          {activeRate !== null && activeRate > 0
            ? t('ads.boost.activeRate', { count: activeCount, rate: rate(activeRate) })
            : t('ads.boost.active', { count: activeCount })}
        </Text>
      )}
      <Pressable
        onPress={watch}
        disabled={!canWatch}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !canWatch, busy: phase === 'watching' }}
        style={({ pressed }) => [styles.button, !canWatch && styles.buttonDisabled, pressed && { opacity: 0.85 }]}>
        {/* The spinner only covers loading the ad; while the server confirms the reward the (disabled) button says so. */}
        {phase === 'watching' ? <ActivityIndicator color={theme.colors.neonInk} /> : <Text style={styles.buttonText}>{label}</Text>}
      </Pressable>
      {message && (
        <Text style={message === 'granted' ? styles.ok : styles.note}>
          {message === 'granted' && grantedClbPerHour !== null
            ? t('ads.boost.grantedRate', { rate: rate(grantedClbPerHour) })
            : t(MESSAGES[message])}
        </Text>
      )}
    </NeonCard>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.neon, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  texts: { flex: 1 },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md + 1 },
  body: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 4, lineHeight: 17 },
  hint: { color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
  button: {
    marginTop: theme.spacing.md,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },
  ok: { color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
  note: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
});
