import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import type { ThsBreakdown } from '@/services/mining-api';
import { theme } from '@/theme';

const ROWS: { key: keyof ThsBreakdown; label: TranslationKey }[] = [
  { key: 'base', label: 'rate.base' },
  { key: 'friends', label: 'rate.friends' },
  { key: 'steps', label: 'rate.steps' },
  { key: 'league', label: 'rate.league' },
  { key: 'ads', label: 'rate.ads' },
];

type Props = {
  visible: boolean;
  breakdown: ThsBreakdown | null;
  total: number;
  onClose: () => void;
};

export function RateBreakdownModal({ visible, breakdown, total, onClose }: Props) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.top}>
            <Text style={styles.title}>{t('rate.title')}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          {ROWS.map(({ key, label }) => (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{t(label)}</Text>
              <Text style={styles.value}>+{(breakdown?.[key] ?? 0).toFixed(2)} Th/s</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('rate.total')}</Text>
            <Text style={styles.totalValue}>{total.toFixed(2)} Th/s</Text>
          </View>
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
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  label: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm },
  value: { color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.sm },
  totalRow: { borderBottomWidth: 0, marginTop: theme.spacing.xs },
  totalLabel: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md },
  totalValue: { color: theme.colors.accent, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.md },
});
