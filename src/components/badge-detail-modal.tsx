import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { BADGE_META } from '@/lib/badges';
import type { BadgeId } from '@/services/badges-api';
import { theme } from '@/theme';

type Props = {
  /** The badge to show, with when it was earned (null: not yet); null hides the sheet. */
  badge: { id: BadgeId; earnedAt: string | null } | null;
  onClose: () => void;
  /** Shares an earned badge. */
  onShare: (id: BadgeId) => void;
};

/** What a badge is for and, once earned, when; earned badges can be shared from here. */
export function BadgeDetailModal({ badge, onClose, onShare }: Props) {
  const { t, language } = useI18n();
  if (!badge) return null;
  const meta = BADGE_META[badge.id];
  const earnedOn = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.top}>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          <Text style={[styles.icon, !earnedOn && styles.iconLocked]}>{meta.icon}</Text>
          <Text style={styles.name}>{t(meta.name)}</Text>
          <Text style={styles.label}>{t('badge.howLabel')}</Text>
          <Text style={styles.how}>{t(meta.how)}</Text>
          <View style={[styles.status, earnedOn ? styles.statusEarned : null]}>
            <Ionicons name={earnedOn ? 'checkmark-circle' : 'lock-closed'} size={16} color={earnedOn ? theme.colors.positive : theme.colors.textMuted} />
            <Text style={[styles.statusText, earnedOn ? styles.statusTextEarned : null]}>
              {earnedOn ? t('badge.earnedOn', { date: earnedOn }) : t('badge.notYet')}
            </Text>
          </View>
          {earnedOn ? <Button label={t('share.share')} icon="share-social" onPress={() => onShare(badge.id)} style={styles.share} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.xl },
  sheet: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  top: { alignSelf: 'stretch', alignItems: 'flex-end' },
  icon: { fontSize: 48, marginBottom: theme.spacing.sm },
  iconLocked: { opacity: 0.35 },
  name: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg, textAlign: 'center' },
  label: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: theme.spacing.lg,
  },
  how: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, textAlign: 'center', lineHeight: 20, marginTop: 4 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.lg,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.ringTrack,
  },
  statusEarned: { backgroundColor: theme.colors.positiveSoft },
  statusText: { color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },
  statusTextEarned: { color: theme.colors.positive },
  share: { alignSelf: 'stretch', marginTop: theme.spacing.lg },
});
