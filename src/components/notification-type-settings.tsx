import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useNotifications } from '@/context/notifications';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { PRIORITY } from '@/lib/notification-plan';
import type { NotificationType } from '@/lib/notification-plan';
import { theme } from '@/theme';

const LABELS: Record<NotificationType, { title: TranslationKey; hint: TranslationKey }> = {
  sessionEnd: { title: 'profile.notif.type.sessionEnd', hint: 'profile.notif.type.sessionEndHint' },
  streak: { title: 'profile.notif.type.streak', hint: 'profile.notif.type.streakHint' },
  league: { title: 'profile.notif.type.league', hint: 'profile.notif.type.leagueHint' },
  steps: { title: 'profile.notif.type.steps', hint: 'profile.notif.type.stepsHint' },
  boost: { title: 'profile.notif.type.boost', hint: 'profile.notif.type.boostHint' },
  comeback: { title: 'profile.notif.type.comeback', hint: 'profile.notif.type.comebackHint' },
};

/**
 * Profile → Notifications: one switch per kind, under the main switch (dimmed while that is off).
 * `embedded` draws just the rows, for a card that already holds the main switch.
 */
export function NotificationTypeSettings({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const { active, typePrefs, setTypeEnabled } = useNotifications();
  const Frame = embedded ? View : Card;
  return (
    <Frame testID="notif-types" style={StyleSheet.flatten([embedded ? styles.embedded : styles.card, !active && styles.off])}>
      {PRIORITY.map((type, i) => (
        <View key={type} style={[styles.row, i > 0 && styles.divided]}>
          <View style={styles.text}>
            <Text style={styles.title}>{t(LABELS[type].title)}</Text>
            <Text style={styles.hint}>{t(LABELS[type].hint)}</Text>
          </View>
          <Switch
            testID={`notif-type-${type}`}
            value={typePrefs[type]}
            disabled={!active}
            onValueChange={(on) => setTypeEnabled(type, on)}
            trackColor={{ true: theme.colors.neon, false: theme.colors.ringTrack }}
            thumbColor={theme.colors.text}
            accessibilityLabel={t(LABELS[type].title)}
          />
        </View>
      ))}
    </Frame>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  embedded: { marginTop: theme.spacing.sm },
  off: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  text: { flex: 1 },
  title: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },
  hint: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: 2 },
});
