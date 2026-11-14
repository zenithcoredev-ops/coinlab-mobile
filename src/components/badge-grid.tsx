import { Ionicons } from '@expo/vector-icons';
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
            testID={`badge-${id}`}
            style={({ pressed }) => [styles.card, earned ? styles.cardEarned : styles.cardLocked, pressed && { opacity: 0.8 }]}>
            {/* Earned: gold glow behind the icon. Locked: a faint grey silhouette with a small lock. */}
            <View style={[styles.iconWrap, earned ? styles.iconWrapEarned : styles.iconWrapLocked]}>
              <Text style={[styles.icon, !earned && styles.iconLocked]}>{meta.icon}</Text>
              {!earned && (
                <View style={styles.lock} testID={`badge-lock-${id}`}>
                  <Ionicons name="lock-closed" size={10} color={theme.colors.text} />
                </View>
              )}
            </View>
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
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  cardEarned: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
  cardLocked: { backgroundColor: theme.colors.glass, borderColor: theme.colors.ringTrack },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconWrapEarned: {
    backgroundColor: theme.colors.accentSoft,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  iconWrapLocked: { backgroundColor: theme.colors.ringTrack },
  icon: { fontSize: 26, textShadowColor: theme.colors.goldGlow, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
  // A grey silhouette: the emoji nearly gone, over a grey disc.
  iconLocked: { opacity: 0.18, textShadowRadius: 0 },
  lock: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.ringTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.xs, textAlign: 'center' },
  nameLocked: { color: theme.colors.tabInactive },
  newTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  newText: { color: theme.colors.accentInk, fontFamily: theme.fonts.display, fontSize: 9 },
});
