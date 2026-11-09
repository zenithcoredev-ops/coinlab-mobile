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
        <View style={styles.logo}>
          <Ionicons name="flash" size={16} color={theme.colors.neonInk} />
        </View>
        <Text style={styles.brandText}>{t('app.name')}</Text>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // A green square with a bolt; the name stays white.
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.neon,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  brandText: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg },
  // Gold neon edge: a bright border with a soft gold halo.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
    borderWidth: 1.2,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    borderRadius: theme.radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  pillAtRisk: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },
  pillTextAtRisk: { color: theme.colors.danger },
  pillText: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm },
});
