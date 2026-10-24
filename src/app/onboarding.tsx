import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useNotifications } from '@/context/notifications';
import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { inviteErrorKey, isInviteCodeFormat, normalizeInviteCode, submitInviteCode } from '@/services/friends-api';
import { theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Slide = {
  icon: IconName;
  title: TranslationKey;
  body: TranslationKey;
  /** Extra interactive block under the text. */
  extra?: 'referral' | 'notifications';
};

const SLIDES: Slide[] = [
  { icon: 'hammer', title: 'onboarding.welcome.title', body: 'onboarding.welcome.body', extra: 'referral' },
  { icon: 'flash', title: 'onboarding.mine.title', body: 'onboarding.mine.body' },
  { icon: 'people', title: 'onboarding.friends.title', body: 'onboarding.friends.body' },
  { icon: 'notifications', title: 'onboarding.notif.title', body: 'onboarding.notif.body', extra: 'notifications' },
];

export default function OnboardingScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { auth, onboarding, completeOnboarding } = useSession();
  const { setEnabled } = useNotifications();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [referralMessage, setReferralMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [notifState, setNotifState] = useState<'idle' | 'granted' | 'denied'>('idle');

  if (!auth) return null;
  if (onboarding === 'done' && !finishing) return <Redirect href="/(tabs)" />;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  async function finish() {
    setFinishing(true);
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  async function onApply() {
    if (!auth) return;
    const normalized = normalizeInviteCode(code);
    if (!isInviteCodeFormat(normalized)) {
      setReferralMessage({ text: t('friends.err.invalidFormat'), ok: false });
      return;
    }
    setApplying(true);
    setReferralMessage(null);
    try {
      const res = await submitInviteCode(auth.token, normalized);
      setApplied(true);
      setReferralMessage({ text: t('friends.codeApplied', { bonus: res.bonusClb }), ok: true });
    } catch (e) {
      const key = inviteErrorKey(e);
      setReferralMessage({ text: key ? t(key) : t('common.unknownError'), ok: false });
    } finally {
      setApplying(false);
    }
  }

  async function onAllowNotifications() {
    setNotifState((await setEnabled(true)) ? 'granted' : 'denied');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          {!isLast && (
            <Pressable onPress={finish} hitSlop={12} accessibilityRole="button">
              <Text style={styles.skip}>{t('onboarding.skip')}</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.slide} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name={slide.icon} size={44} color={theme.colors.accent} />
          </View>
          <Text style={styles.title}>{t(slide.title)}</Text>
          <Text style={styles.body}>{t(slide.body, { bonus: 25, ths: '0.20' })}</Text>

          {slide.extra === 'referral' && !applied && (
            <View style={styles.extra}>
              <Text style={styles.extraLabel}>{t('onboarding.referral.label')}</Text>
              <View style={styles.row}>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.toUpperCase());
                    setReferralMessage(null);
                  }}
                  placeholder="CLB-XXXXX"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={9}
                  style={styles.input}
                />
                <Button label={t('friends.enter.apply')} onPress={onApply} loading={applying} disabled={!code} style={styles.apply} />
              </View>
              <Text style={styles.hint}>{t('onboarding.referral.hint', { bonus: 25 })}</Text>
            </View>
          )}
          {slide.extra === 'referral' && referralMessage && (
            <Text style={[styles.message, { color: referralMessage.ok ? theme.colors.positive : theme.colors.danger }]}>
              {referralMessage.text}
            </Text>
          )}

          {slide.extra === 'notifications' && (
            <View style={styles.extra}>
              <Button
                label={notifState === 'granted' ? t('onboarding.notif.enabled') : t('onboarding.notif.allow')}
                onPress={onAllowNotifications}
                variant={notifState === 'granted' ? 'positive' : 'ghost'}
                disabled={notifState === 'granted'}
              />
              {notifState === 'denied' && <Text style={styles.hint}>{t('onboarding.notif.denied')}</Text>}
            </View>
          )}
        </ScrollView>

        <View style={styles.nav}>
          <Button
            label={isLast ? t('onboarding.start') : t('onboarding.next')}
            onPress={isLast ? finish : () => setIndex(index + 1)}
            loading={finishing}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.xl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.lg, minHeight: 56 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.ringTrack },
  dotOn: { width: 22, backgroundColor: theme.colors.accent },
  skip: { color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.md },
  slide: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xl },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl + 4, textAlign: 'center', marginBottom: theme.spacing.md },
  body: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.md, lineHeight: 22, textAlign: 'center' },
  extra: { alignSelf: 'stretch', marginTop: theme.spacing.xl },
  extraLabel: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.sm, marginBottom: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg - 2,
    color: theme.colors.text,
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.fontSizes.md,
    letterSpacing: 1,
    minHeight: 48,
  },
  apply: { minWidth: 88 },
  hint: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: theme.spacing.sm, textAlign: 'center' },
  message: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.md, textAlign: 'center' },
  nav: { paddingBottom: theme.spacing.lg },
});
