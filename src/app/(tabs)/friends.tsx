import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsibleCard } from '@/components/collapsible-card';
import { BACKGROUND_IMAGES, BACKGROUND_SHADES } from '@/components/home/backgrounds';
import { ScreenBackground } from '@/components/home/screen-background';
import { NeonCard } from '@/components/neon-card';
import { ScreenHeader } from '@/components/screen-header';
import { TextScrim } from '@/components/text-scrim';
import { Button, EmptyState } from '@/components/ui';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import { clbPerHourOf, formatClbPerHour } from '@/lib/mining-math';
import { NEON_CARD } from '@/lib/neon-frame';
import { highlighted } from '@/lib/rich-text';
import {
  Friend,
  FriendOverview,
  getFriends,
  inviteErrorKey,
  INVITE_CODE_MAX_LENGTH,
  isInviteCodeFormat,
  normalizeInviteCode,
  submitInviteCode,
} from '@/services/friends-api';
import { theme } from '@/theme';

// If this screen throws while drawing, the tab shows a retry screen instead of the app closing.
export { ScreenError as ErrorBoundary } from '@/components/screen-error';

export default function FriendsScreen() {
  const { t, language } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  // 0 at the top of the list, 1 at its end: drives the background's slow slide.
  const scrollProgress = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    const room = e.contentSize.height - e.layoutMeasurement.height;
    scrollProgress.value = room > 0 ? e.contentOffset.y / room : 0;
  });
  const { auth } = useSession();
  const { refresh: refreshMining } = useMining();
  const token = auth?.token ?? null;

  const [overview, setOverview] = useState<FriendOverview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOverview(await getFriends(token));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [token]);

  // Friend activity changes outside the app, so reload whenever the tab is shown.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onCopy() {
    if (!overview) return;
    await Clipboard.setStringAsync(overview.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onShare() {
    if (!overview) return;
    try {
      await Share.share({
        message: t('friends.shareMessage', { code: overview.inviteCode, bonus: overview.welcomeBonusClb }),
      });
    } catch {
      // The user dismissed or the platform has no share target; nothing to recover.
    }
  }

  async function onApply() {
    if (!token) return;
    const code = normalizeInviteCode(codeInput);
    if (!isInviteCodeFormat(code)) {
      setApplyMessage({ text: t('friends.err.invalidFormat'), ok: false });
      return;
    }
    setApplying(true);
    setApplyMessage(null);
    try {
      const res = await submitInviteCode(token, code);
      setApplyMessage({ text: t('friends.codeApplied', { bonus: res.bonusClb }), ok: true });
      setCodeInput('');
      await Promise.all([load(), refreshMining()]);
    } catch (e) {
      const key = inviteErrorKey(e);
      setApplyMessage({ text: key ? t(key) : t('common.unknownError'), ok: false });
    } finally {
      setApplying(false);
    }
  }

  const rate = overview ? formatClbPerHour(clbPerHourOf(overview.bonusPerFriendClbPerHour, overview.bonusPerFriendThs), language) : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* The picture slides up slowly as the list scrolls; the friends at its bottom show at the end. */}
      <ScreenBackground variant="neon" image={BACKGROUND_IMAGES.friends} shade={BACKGROUND_SHADES.friends} parallax={scrollProgress} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        // Room at the end of the list, so the bottom of the picture shows there.
        contentContainerStyle={[styles.scroll, { paddingBottom: theme.spacing.xxl + 16 + Math.round(windowHeight * 0.35) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />}>
        <ScreenHeader />
        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            {t('friends.title')}
          </Text>
          <Text style={styles.subtitle}>{t('friends.tagline')}</Text>
        </View>

        {!overview ? (
          loadError ? (
            <View style={styles.centerBlock}>
              <TextScrim>
                <Text style={styles.error}>{t('friends.loadFailed')}</Text>
              </TextScrim>
              <Button label={t('common.retry')} onPress={load} variant="ghost" style={styles.retry} />
            </View>
          ) : (
            <ActivityIndicator color={theme.colors.text} style={styles.centerBlock} />
          )
        ) : (
          <>
            <NeonCard grid style={styles.block} testID="invite-card">
              <Text style={styles.label}>{t('friends.yourCode')}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.code} selectable adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>
                  {overview.inviteCode}
                </Text>
                <Pressable
                  onPress={onCopy}
                  accessibilityRole="button"
                  accessibilityLabel={copied ? t('friends.copied') : t('friends.copy')}
                  style={({ pressed }) => [styles.copy, copied && styles.copyDone, pressed && { opacity: 0.8 }]}>
                  <Text style={styles.copyText}>{copied ? t('friends.copied') : t('friends.copy')}</Text>
                </Pressable>
              </View>
              <Text style={styles.benefit}>
                {highlighted(t('friends.benefit'), { rate, bonus: String(overview.welcomeBonusClb) }).map((part, i) =>
                  part.value ? (
                    <Text key={i} style={styles.amount}>
                      {part.text}
                    </Text>
                  ) : (
                    part.text
                  )
                )}
              </Text>
              <Pressable onPress={onShare} accessibilityRole="button" style={({ pressed }) => [styles.share, pressed && { opacity: 0.85 }]}>
                <Ionicons name="share-social" size={18} color={theme.colors.neonInk} />
                <Text style={styles.shareText}>{t('friends.share')}</Text>
              </Pressable>
            </NeonCard>

            <View style={styles.stats}>
              <Stat testID="stat-invited" value={String(overview.invitedCount)} label={t('friends.stat.invited')} />
              <Stat testID="stat-active" value={String(overview.activeCount)} label={t('friends.stat.active')} />
              <Stat
                testID="stat-bonus"
                gold
                value={`+${formatClbPerHour(clbPerHourOf(overview.totalBonusClbPerHour, overview.totalBonusThs), language)}`}
                label={t('friends.stat.bonus')}
              />
            </View>

            <NeonCard style={styles.block} testID="team-card">
              <Text style={styles.cardTitle}>{t('friends.team')}</Text>
              {overview.friends.length === 0 ? (
                <EmptyState icon="people-outline" title={t('friends.emptyTitle')} body={t('friends.empty')} style={styles.empty} />
              ) : (
                overview.friends.map((f, i) => <FriendRow key={f.id} friend={f} first={i === 0} />)
              )}
            </NeonCard>

            {!overview.hasUsedCode && (
              <NeonCard style={styles.block} testID="enter-card">
                <Text style={styles.cardTitle}>{t('friends.enter.title')}</Text>
                <Text style={styles.hint}>{t('friends.enter.hint', { bonus: overview.welcomeBonusClb })}</Text>
                <View style={styles.enterRow}>
                  <TextInput
                    value={codeInput}
                    onChangeText={(v) => {
                      setCodeInput(v.toUpperCase());
                      setApplyMessage(null);
                    }}
                    placeholder="WAGO-XXXXX"
                    placeholderTextColor={theme.colors.tabInactive}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={INVITE_CODE_MAX_LENGTH}
                    style={styles.input}
                  />
                  <Pressable
                    onPress={onApply}
                    disabled={!codeInput || applying}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !codeInput || applying, busy: applying }}
                    style={({ pressed }) => [styles.apply, (!codeInput || applying) && styles.applyDisabled, pressed && { opacity: 0.85 }]}>
                    {applying ? <ActivityIndicator color={theme.colors.neonInk} /> : <Text style={styles.applyText}>{t('friends.enter.apply')}</Text>}
                  </Pressable>
                </View>
                {applyMessage && (
                  // On a dark backing: the bottom of this tab's picture is barely shaded and bright.
                  <TextScrim style={styles.applyScrim}>
                    <Text style={[styles.applyMessage, { color: applyMessage.ok ? theme.colors.neon : theme.colors.danger }]}>{applyMessage.text}</Text>
                  </TextScrim>
                )}
              </NeonCard>
            )}

            <CollapsibleCard neon id="friends" title={t('friends.how.title')} style={styles.block}>
              <Step n={1} text={t('friends.how.step1')} />
              <Step n={2} text={t('friends.how.step2', { bonus: overview.welcomeBonusClb })} />
              <Step n={3} text={t('friends.how.step3', { rate })} />
              <Step n={4} text={t('friends.how.step4')} />
            </CollapsibleCard>
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, gold, testID }: { value: string; label: string; gold?: boolean; testID?: string }) {
  return (
    <NeonCard tone={gold ? 'gold' : 'green'} grid style={styles.stat} testID={testID}>
      <Text style={[styles.statNum, gold && styles.statNumGold]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </NeonCard>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

/** One friend: letter avatar, name and a status chip (no steps or balance). */
function FriendRow({ friend, first }: { friend: Friend; first: boolean }) {
  const { t } = useI18n();
  return (
    <View style={[styles.friend, !first && styles.friendDivided]}>
      <View style={[styles.avatar, !friend.active && styles.avatarInactive]}>
        <Text style={[styles.avatarText, !friend.active && styles.avatarTextInactive]}>{(friend.name ?? '?').charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.friendName} numberOfLines={1}>
        {friend.name}
      </Text>
      <View style={[styles.chip, friend.active ? styles.chipActive : styles.chipInactive]}>
        <Text style={[styles.chipText, friend.active ? styles.chipTextActive : styles.chipTextInactive]}>
          {friend.active ? t('friends.status.active') : t('friends.status.inactive')}
        </Text>
      </View>
    </View>
  );
}

// Glow only on titles and big numbers, always behind the text.
const glow = (color: string) => ({ textShadowColor: color, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } });
/** Inside a stat card: past the corner brackets, so values sit between them. */
const STAT_SIDE_PADDING = NEON_CARD.bracket.inset + 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgDeep },
  scroll: { paddingHorizontal: theme.spacing.lg + 2, paddingTop: theme.spacing.xl },
  centerBlock: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, textAlign: 'center' },
  retry: { marginTop: theme.spacing.lg, alignSelf: 'center' },
  block: { marginBottom: theme.spacing.lg },

  titleBlock: { marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl + 6, lineHeight: 34, ...glow(theme.colors.neonGlow) },
  subtitle: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm + 0.5, lineHeight: 19, marginTop: 6 },

  label: {
    color: theme.colors.text,
    fontFamily: theme.fonts.displayMedium,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
  code: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xxl - 4, letterSpacing: 1, ...glow(theme.colors.neonGlow) },
  copy: {
    borderWidth: 1.4,
    borderColor: theme.colors.neon,
    borderRadius: theme.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md + 2,
    backgroundColor: theme.colors.neonSoft,
  },
  copyDone: { backgroundColor: theme.colors.glass },
  copyText: { color: theme.colors.neon, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm },
  benefit: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19 },
  amount: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium },
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neon,
    marginTop: theme.spacing.lg,
  },
  shareText: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },

  stats: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  stat: { flex: 1, alignItems: 'stretch', paddingVertical: theme.spacing.lg, paddingHorizontal: STAT_SIDE_PADDING },
  statNum: { textAlign: 'center', color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl, ...glow(theme.colors.neonGlow) },
  statNumGold: { color: theme.colors.accent, ...glow(theme.colors.goldGlow) },
  statLabel: { textAlign: 'center', color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: 4, lineHeight: 15 },

  cardTitle: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg - 1, marginBottom: theme.spacing.sm },
  hint: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19, marginBottom: theme.spacing.md },
  empty: { paddingVertical: theme.spacing.lg },
  friend: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm + 2 },
  friendDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.ringTrack },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.neon, alignItems: 'center', justifyContent: 'center' },
  avatarInactive: { backgroundColor: theme.colors.ringTrack },
  avatarText: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },
  avatarTextInactive: { color: theme.colors.text },
  friendName: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md },
  chip: { borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  chipActive: { backgroundColor: theme.colors.neonSoft, borderColor: theme.colors.neon },
  chipInactive: { backgroundColor: theme.colors.glass, borderColor: theme.colors.ringTrack },
  chipText: { fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.xs },
  chipTextActive: { color: theme.colors.neon },
  chipTextInactive: { color: theme.colors.tabInactive },

  enterRow: { flexDirection: 'row', gap: theme.spacing.sm },
  input: {
    flex: 1,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.ringTrack,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg - 2,
    color: theme.colors.text,
    fontFamily: theme.fonts.displayMedium,
    fontSize: theme.fontSizes.md,
    letterSpacing: 1,
    minHeight: 48,
  },
  apply: { minWidth: 92, minHeight: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.neon, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.md },
  applyDisabled: { opacity: 0.5 },
  applyText: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },
  applyScrim: { alignSelf: 'stretch', alignItems: 'flex-start', marginTop: theme.spacing.md },
  applyMessage: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },

  step: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.neonSoft,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: theme.colors.neon, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.xs },
  stepText: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19 },
});
