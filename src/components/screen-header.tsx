import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useMining } from '@/context/mining';
import { useI18n } from '@/i18n';
import { isStreakAtRisk } from '@/lib/mining-math';
import { theme } from '@/theme';

/** App name on the left; the streak badge on the right (hidden when `showStreak` is false). */
export function ScreenHeader({ showStreak = true }: { showStreak?: boolean }) {
  const { t } = useI18n();
  const { status } = useMining();
  const streak = status?.streak ?? 0;
  // A live streak that hasn't been extended today is about to expire at 00:00 UTC.
  const atRisk = isStreakAtRisk(status);

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <View style={styles.dot} />
        <Text style={styles.brandText}>CoinLab</Text>
      </View>
      {showStreak && (
        <View style={[styles.pill, atRisk && styles.pillAtRisk]} accessibilityLabel={t('streak.days', { count: streak })}>
          <Ionicons name="flame" size={14} color={atRisk ? theme.colors.danger : theme.colors.accent} />
          <Text style={[styles.pillText, atRisk && styles.pillTextAtRisk]}>{t('streak.days', { count: streak })}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.positive },
  brandText: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg - 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentBorder,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  pillAtRisk: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },
  pillTextAtRisk: { color: theme.colors.danger },
  pillText: { color: theme.colors.accent, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs },
});
