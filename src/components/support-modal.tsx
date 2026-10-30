import Constants from 'expo-constants';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, SectionLabel, Segmented } from '@/components/ui';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { leagueWeekEndParams } from '@/lib/league-week';
import { streakDayIsLocal } from '@/lib/mining-math';
import {
  createTicket,
  MAX_MESSAGE_LENGTH,
  messageProblem,
  SUPPORT_CATEGORIES,
  SupportCategory,
  ticketErrorKey,
} from '@/services/support-api';
import { theme } from '@/theme';

const FAQ: { q: TranslationKey; a: TranslationKey }[] = [
  { q: 'faq.earn.q', a: 'faq.earn.a' },
  { q: 'faq.cash.q', a: 'faq.cash.a' },
  { q: 'faq.accounts.q', a: 'faq.accounts.a' },
  { q: 'faq.streak.q', a: 'faq.streak.a' },
  { q: 'faq.league.q', a: 'faq.league.a' },
  { q: 'faq.rewards.q', a: 'faq.rewards.a' },
];

const CATEGORY_LABELS: Record<SupportCategory, TranslationKey> = {
  account: 'support.category.account',
  mining: 'support.category.mining',
  league: 'support.category.league',
  other: 'support.category.other',
};

/** Help & Support: FAQ plus a form that files a ticket on the server. */
export function SupportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, language } = useI18n();
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const { status } = useMining();
  const weekEnd = leagueWeekEndParams(t, language, new Date());
  const faq = streakDayIsLocal(status)
    ? FAQ.map((item) => (item.a === 'faq.streak.a' ? { ...item, a: 'faq.streak.aLocal' as const } : item))
    : FAQ;

  const [open, setOpen] = useState<number | null>(null);
  const [category, setCategory] = useState<SupportCategory>('other');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentNumber, setSentNumber] = useState<number | null>(null);

  function close() {
    onClose();
    // Reset after the close animation so a sent form doesn't flash back to the form.
    setTimeout(() => {
      setSentNumber(null);
      setMessage('');
      setError(null);
    }, 300);
  }

  async function onSubmit() {
    if (!token) return;
    const problem = messageProblem(message);
    if (problem) {
      setError(t(problem === 'tooShort' ? 'support.err.tooShort' : 'support.err.tooLong'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const ticket = await createTicket(token, {
        category,
        message: message.trim(),
        appVersion: Constants.expoConfig?.version,
        locale: language,
      });
      setSentNumber(ticket.number);
    } catch (e) {
      setError(t(ticketErrorKey(e)));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.top}>
            <Text style={styles.title}>{t('profile.help')}</Text>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <SectionLabel>{t('support.faq')}</SectionLabel>
            {faq.map((item, i) => (
              <Pressable
                key={item.q}
                accessibilityRole="button"
                accessibilityState={{ expanded: open === i }}
                onPress={() => setOpen(open === i ? null : i)}
                style={styles.faq}>
                <Text style={styles.question}>{t(item.q)}</Text>
                {open === i && <Text style={styles.answer}>{t(item.a, item.a === 'faq.league.a' ? weekEnd : undefined)}</Text>}
              </Pressable>
            ))}

            <SectionLabel>{t('support.stillNeedHelp')}</SectionLabel>
            {sentNumber !== null ? (
              <View style={styles.sent}>
                <Text style={styles.sentTitle}>{t('support.sent.title', { number: sentNumber })}</Text>
                <Text style={styles.sentBody}>{t('support.sent.body')}</Text>
                <Button label={t('common.close')} onPress={close} variant="ghost" style={styles.sentButton} />
              </View>
            ) : (
              <>
                <Segmented
                  value={category}
                  options={SUPPORT_CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_LABELS[c]) }))}
                  onChange={setCategory}
                />
                <TextInput
                  value={message}
                  onChangeText={(v) => {
                    setMessage(v);
                    setError(null);
                  }}
                  placeholder={t('support.placeholder')}
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  maxLength={MAX_MESSAGE_LENGTH}
                  textAlignVertical="top"
                  style={styles.input}
                />
                {error && <Text style={styles.error}>{error}</Text>}
                <Button label={t('support.submit')} onPress={onSubmit} loading={sending} style={styles.submit} />
                <Text style={styles.fine}>{t('support.fineprint')}</Text>
                {sending && <ActivityIndicator color={theme.colors.text} />}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl - 2 },
  closeText: { color: theme.colors.accent, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl + 16 },
  faq: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md + 2,
    marginBottom: theme.spacing.sm,
  },
  question: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 1 },
  answer: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19, marginTop: theme.spacing.sm },
  input: {
    minHeight: 120,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
  },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.sm },
  submit: { marginTop: theme.spacing.md },
  fine: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, textAlign: 'center', marginTop: theme.spacing.md },
  sent: {
    backgroundColor: theme.colors.positiveSoft,
    borderColor: theme.colors.positiveBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  sentTitle: { color: theme.colors.positive, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md },
  sentBody: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19 },
  sentButton: { marginTop: theme.spacing.sm },
});
