import { StyleSheet, Text } from 'react-native';

import { Button, Card } from '@/components/ui';
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

/** Mine screen: the optional "watch an ad for a speed boost" card. The reward is a speed boost only. */
export function AdBoostCard() {
  const { t, language } = useI18n();
  const { visible, ads, limitReached, waitMs, canWatch, phase, message, grantedClbPerHour, watch } = useRewardedBoost();
  if (!visible || !ads) return null;

  const rate = (perHour: number) => formatClbPerHour(perHour, language);
  const perAd = adBoostClbPerHour(ads);
  const activeCount = activeBoostCount(ads);
  const activeRate = activeBoostsClbPerHour(ads);

  const hint = limitReached
    ? t('ads.boost.limit')
    : waitMs > 0
      ? t('ads.boost.wait', { time: formatDuration(waitMs) })
      : t('ads.boost.today', { used: ads.usedToday, limit: ads.dailyLimit });

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{t('ads.boost.title')}</Text>
      <Text style={styles.body}>{t('ads.boost.body')}</Text>
      {perAd !== null && <Text style={styles.hint}>{t('ads.boost.perAd', { rate: rate(perAd) })}</Text>}
      <Text style={styles.hint}>{hint}</Text>
      {activeCount > 0 && (
        <Text style={styles.hint}>
          {activeRate !== null && activeRate > 0
            ? t('ads.boost.activeRate', { count: activeCount, rate: rate(activeRate) })
            : t('ads.boost.active', { count: activeCount })}
        </Text>
      )}
      <Button
        label={phase === 'verifying' ? t('ads.boost.verifying') : t('ads.boost.watch')}
        onPress={watch}
        disabled={!canWatch}
        // The spinner hides the label, so it only covers loading the ad; while the server confirms the
        // reward the (disabled) button says so.
        loading={phase === 'watching'}
        variant="ghost"
        style={styles.button}
      />
      {message && (
        <Text style={message === 'granted' ? styles.ok : styles.note}>
          {message === 'granted' && grantedClbPerHour !== null
            ? t('ads.boost.grantedRate', { rate: rate(grantedClbPerHour) })
            : t(MESSAGES[message])}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.md },
  title: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 1 },
  body: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: theme.spacing.sm },
  hint: { color: theme.colors.accent, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
  button: { marginTop: theme.spacing.md },
  ok: { color: theme.colors.positive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
  note: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
});
