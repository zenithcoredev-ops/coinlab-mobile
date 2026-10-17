import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, ScreenTitle, SectionLabel } from '@/components/ui';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import {
  Friend,
  FriendOverview,
  getFriends,
  inviteErrorKey,
  isInviteCodeFormat,
  normalizeInviteCode,
  submitInviteCode,
} from '@/services/friends-api';
import { theme } from '@/theme';

export default function FriendsScreen() {
  const { t } = useI18n();
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
    setTimeout(() => setCopied(false), 1800);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />
        }>
        <ScreenHeader />
        <ScreenTitle
          title={t('friends.title')}
          subtitle={t('friends.subtitle', { ths: (overview?.bonusPerFriendThs ?? 0.2).toFixed(2) })}
        />

        {!overview ? (
          loadError ? (
            <View style={styles.centerBlock}>
              <Text style={styles.error}>{t('friends.loadFailed')}</Text>
              <Button label={t('common.retry')} onPress={load} variant="ghost" style={styles.retry} />
            </View>
          ) : (
            <ActivityIndicator color={theme.colors.text} style={styles.centerBlock} />
          )
        ) : (
          <>
            <View style={styles.inviteCard}>
              <Text style={styles.inviteLabel}>{t('friends.yourCode')}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.code} selectable>
                  {overview.inviteCode}
                </Text>
                <Button
                  label={copied ? t('friends.copied') : t('friends.copy')}
                  onPress={onCopy}
                  variant="positive"
                  style={styles.copyButton}
                />
              </View>
              <Text style={styles.benefit}>
                {t('friends.benefit', {
                  ths: overview.bonusPerFriendThs.toFixed(2),
                  bonus: overview.welcomeBonusClb,
                })}
              </Text>
            </View>

            <Button label={t('friends.share')} onPress={onShare} variant="positive" style={styles.shareButton} />

            <View style={styles.statRow}>
              <Stat value={String(overview.invitedCount)} label={t('friends.stat.invited')} />
              <Stat value={String(overview.activeCount)} label={t('friends.stat.active')} />
              <Stat value={`+${overview.totalBonusThs.toFixed(2)}`} label={t('friends.stat.bonus')} />
            </View>

            <Card style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>{t('friends.how.title')}</Text>
              <Step n={1} text={t('friends.how.step1')} />
              <Step n={2} text={t('friends.how.step2', { bonus: overview.welcomeBonusClb })} />
              <Step n={3} text={t('friends.how.step3', { ths: overview.bonusPerFriendThs.toFixed(2) })} />
              <Step n={4} text={t('friends.how.step4')} />
            </Card>

            {!overview.hasUsedCode && (
              <Card style={styles.enterCard}>
                <Text style={styles.enterTitle}>{t('friends.enter.title')}</Text>
                <Text style={styles.enterHint}>{t('friends.enter.hint', { bonus: overview.welcomeBonusClb })}</Text>
                <View style={styles.enterRow}>
                  <TextInput
                    value={codeInput}
                    onChangeText={(v) => {
                      setCodeInput(v.toUpperCase());
                      setApplyMessage(null);
                    }}
                    placeholder="CLB-XXXXX"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={9}
                    style={styles.input}
                  />
                  <Button
                    label={t('friends.enter.apply')}
                    onPress={onApply}
                    loading={applying}
                    disabled={!codeInput}
                    style={styles.applyButton}
                  />
                </View>
                {applyMessage && (
                  <Text style={[styles.applyMessage, { color: applyMessage.ok ? theme.colors.positive : theme.colors.danger }]}>
                    {applyMessage.text}
                  </Text>
                )}
              </Card>
            )}

            <SectionLabel>{t('friends.team')}</SectionLabel>
            {overview.friends.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t('friends.empty')}</Text>
              </View>
            ) : (
              overview.friends.map((f) => <FriendRow key={f.id} friend={f} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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

function FriendRow({ friend }: { friend: Friend }) {
  const { t } = useI18n();
  return (
    <View style={[styles.friend, !friend.active && styles.friendInactive]}>
      <View style={[styles.avatar, !friend.active && styles.avatarInactive]}>
        <Text style={[styles.avatarText, !friend.active && { color: theme.colors.textMuted }]}>
          {friend.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text style={friend.active ? styles.statusActive : styles.statusInactive}>
          {friend.active ? t('friends.status.active') : t('friends.status.inactive')}
        </Text>
      </View>
      <Text style={styles.friendBonus}>+{friend.bonusThs.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl + 16 },
  centerBlock: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, textAlign: 'center' },
  retry: { marginTop: theme.spacing.lg, alignSelf: 'center' },

  inviteCard: {
    backgroundColor: theme.colors.positiveSoft,
    borderWidth: 1,
    borderColor: theme.colors.positiveBorder,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg + 2,
    marginBottom: theme.spacing.md,
  },
  inviteLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: theme.spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.lg - 2,
    paddingRight: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  code: { color: theme.colors.text, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.lg, letterSpacing: 1 },
  copyButton: { minHeight: 36, paddingVertical: 6, paddingHorizontal: theme.spacing.md },
  benefit: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm - 0.5, lineHeight: 18 },
  shareButton: { marginBottom: theme.spacing.lg },

  statRow: { flexDirection: 'row', gap: theme.spacing.sm + 2, marginBottom: theme.spacing.lg },
  stat: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md + 2,
    padding: theme.spacing.md + 2,
    alignItems: 'center',
  },
  statNum: { color: theme.colors.text, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.lg + 2 },
  statLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.xs - 0.5,
    marginTop: 4,
    textAlign: 'center',
  },

  stepsCard: { marginBottom: theme.spacing.lg, gap: theme.spacing.md },
  stepsTitle: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },
  step: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: theme.colors.accent, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.xs },
  stepText: { flex: 1, color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19 },

  enterCard: { marginBottom: theme.spacing.lg },
  enterTitle: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md, marginBottom: 4 },
  enterHint: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginBottom: theme.spacing.md },
  enterRow: { flexDirection: 'row', gap: theme.spacing.sm },
  input: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg - 2,
    color: theme.colors.text,
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.fontSizes.md,
    letterSpacing: 1,
    minHeight: 48,
  },
  applyButton: { minWidth: 88 },
  applyMessage: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.md },

  empty: { alignItems: 'center', paddingVertical: theme.spacing.xl + 4 },
  emptyText: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, textAlign: 'center', lineHeight: 20 },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md + 2,
    marginBottom: theme.spacing.sm,
  },
  friendInactive: { opacity: 0.6 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInactive: { backgroundColor: theme.colors.ringTrack },
  avatarText: { color: theme.colors.background, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },
  friendInfo: { flex: 1 },
  friendName: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 0.5 },
  statusActive: { color: theme.colors.positive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: 2 },
  statusInactive: { color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: 2 },
  friendBonus: { color: theme.colors.accent, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.sm },
});
