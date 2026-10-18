import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BADGE_META, BADGE_ORDER } from '@/lib/badges';
import { useI18n } from '@/i18n';
import type { Badge, BadgeId } from '@/services/badges-api';
import { theme } from '@/theme';

type Props = {
  badges: Badge[];
  /** Ids earned since the user last looked; they get a "new" mark. */
  newIds: string[];
  onPressBadge: (id: BadgeId, earned: boolean) => void;
};

export function BadgeGrid({ badges, newIds, onPressBadge }: Props) {
  const { t } = useI18n();
  const earnedIds = new Set(badges.filter((b) => b.earnedAt).map((b) => b.id));

  return (
    <View style={styles.grid}>
      {BADGE_ORDER.map((id) => {
        const meta = BADGE_META[id];
        const earned = earnedIds.has(id);
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${t(meta.name)}. ${t(meta.desc)}`}
            onPress={() => onPressBadge(id, earned)}
            style={[styles.card, earned ? styles.cardEarned : styles.cardLocked]}>
            <Text style={[styles.icon, !earned && styles.iconLocked]}>{meta.icon}</Text>
            <Text style={[styles.name, !earned && styles.nameLocked]} numberOfLines={2}>
              {t(meta.name)}
            </Text>
            {newIds.includes(id) && (
              <View style={styles.newTag}>
                <Text style={styles.newText}>{t('badge.new')}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm + 2 },
  card: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  cardEarned: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder },
  cardLocked: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  icon: { fontSize: 28 },
  iconLocked: { opacity: 0.3 },
  name: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.xs, textAlign: 'center' },
  nameLocked: { color: theme.colors.textMuted },
  newTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  newText: { color: theme.colors.accentInk, fontFamily: theme.fonts.bodySemiBold, fontSize: 9 },
});
