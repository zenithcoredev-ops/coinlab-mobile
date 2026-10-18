import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import { shareMessage, ShareCard } from '@/lib/share';
import { getAccount } from '@/services/me-api';
import { theme } from '@/theme';

type Props = {
  card: ShareCard | null;
  /** Extra line under the subtitle, already translated (e.g. the reward). */
  detail?: string;
  onClose: () => void;
};

/** Preview of an achievement card with system-share and copy actions. */
export function ShareCardModal({ card, detail, onClose }: Props) {
  const { t } = useI18n();
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!card || !token) return;
    setCopied(false);
    getAccount(token)
      .then((a) => setInviteCode(a.inviteCode))
      .catch(() => {});
  }, [card, token]);

  if (!card) return null;
  const title = t(card.title.key, card.title.params);
  const subtitle = t(card.subtitle.key, card.subtitle.params);
  const message = shareMessage(title, detail ? `${subtitle}\n${detail}` : subtitle, inviteCode, (code) =>
    t('share.invite', { code })
  );

  async function onShare() {
    try {
      await Share.share({ message });
    } catch {
      // The user dismissed the sheet or no target is available; nothing to do.
    }
  }

  async function onCopy() {
    await Clipboard.setStringAsync(message);
    setCopied(true);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.card}>
            <Text style={styles.brand}>⛏️ CoinLab</Text>
            <Text style={styles.icon}>{card.icon}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          </View>
          <Button label={t('share.share')} onPress={onShare} style={styles.action} />
          <Button label={copied ? t('share.copied') : t('share.copy')} onPress={onCopy} variant="ghost" style={styles.action} />
          <Button label={t('common.close')} onPress={onClose} variant="ghost" style={styles.action} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.xl },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  card: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  brand: { color: theme.colors.textMuted, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm },
  icon: { fontSize: 64, marginVertical: theme.spacing.sm },
  title: { color: theme.colors.accent, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl, textAlign: 'center' },
  subtitle: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.md, textAlign: 'center' },
  detail: { color: theme.colors.textMuted, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs + 0.5, textAlign: 'center' },
  action: { minHeight: 44 },
});
