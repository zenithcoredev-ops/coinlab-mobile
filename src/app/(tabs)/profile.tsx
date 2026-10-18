import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ComponentProps, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeGrid } from '@/components/badge-grid';
import { ShareCardModal } from '@/components/share-card-modal';
import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, ScreenTitle, SectionLabel, Segmented } from '@/components/ui';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/constants/config';
import { useMining } from '@/context/mining';
import { useNotifications } from '@/context/notifications';
import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import type { LanguagePreference } from '@/i18n';
import { FRAME_NAME_KEYS } from '@/lib/league';
import { badgeCard, ShareCard } from '@/lib/share';
import { Badge, earnedCount, getBadges, newlyEarned, vipDaysLeft } from '@/services/badges-api';
import { Account, deleteAccount, getAccount } from '@/services/me-api';
import { theme } from '@/theme';

const BADGES_SEEN_KEY = 'coinlab_badges_seen';

export default function ProfileScreen() {
  const { t, language, preference, setPreference } = useI18n();
  const { auth, signOut } = useSession();
  const { status } = useMining();
  const token = auth?.token ?? null;

  const [account, setAccount] = useState<Account | null>(null);
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [badgesFailed, setBadgesFailed] = useState(false);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);
  const [shareCard, setShareCard] = useState<ShareCard | null>(null);
  const { active: notifOn, permission, setEnabled, refreshPermission } = useNotifications();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        getAccount(token).then(setAccount).catch(() => {});
        loadBadges(token);
      }
      refreshPermission();
    }, [token, refreshPermission])
  );

  async function loadBadges(authToken: string) {
    try {
      const { badges: next } = await getBadges(authToken);
      const seen = await AsyncStorage.getItem(BADGES_SEEN_KEY)
        .then((raw) => (raw ? (JSON.parse(raw) as string[]) : []))
        .catch(() => [] as string[]);
      setBadges(next);
      setBadgesFailed(false);
      setNewBadgeIds(newlyEarned(next, seen));
      AsyncStorage.setItem(BADGES_SEEN_KEY, JSON.stringify(next.filter((b) => b.earnedAt).map((b) => b.id))).catch(() => {});
    } catch {
      setBadgesFailed(true);
    }
  }

  async function onToggleNotifications(next: boolean) {
    const enabled = await setEnabled(next);
    if (next && !enabled) {
      Alert.alert(t('profile.notif.deniedTitle'), t('profile.notif.deniedBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.notif.openSettings'), onPress: () => Linking.openSettings() },
      ]);
    }
  }

  function onSignOut() {
    Alert.alert(t('profile.signOut'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  }

  function onDelete() {
    setDeleteError(null);
    Alert.alert(t('profile.delete.title'), t('profile.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.delete.confirm'), style: 'destructive', onPress: runDelete },
    ]);
  }

  async function runDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteAccount(token);
      await signOut();
    } catch {
      setDeleteError(t('profile.delete.failed'));
    } finally {
      setDeleting(false);
    }
  }

  const name = account?.name ?? auth?.name ?? '';
  const version = Constants.expoConfig?.version ?? '';
  const memberSince = account ? new Date(account.createdAt).toLocaleDateString(language) : null;
  const balance = status ? parseFloat(status.balance) : account ? parseFloat(account.balance) : 0;

  const vipDays = vipDaysLeft(account?.vipUntil ?? null, Date.now());
  const frameKey = account?.equippedFrame ? FRAME_NAME_KEYS[account.equippedFrame] : undefined;

  const languageOptions: { value: LanguagePreference; label: string }[] = [
    { value: 'auto', label: t('profile.language.auto') },
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Türkçe' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader />
        <ScreenTitle title={t('tabs.profile')} />

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || 'C'}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          {memberSince && <Text style={styles.since}>{t('profile.memberSince', { date: memberSince })}</Text>}
        </View>

        <Card style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Ionicons name="logo-google" size={18} color={theme.colors.text} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountProvider}>{t('profile.signedInWith', { provider: 'Google' })}</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {account?.email ?? ''}
            </Text>
          </View>
        </Card>

        <Card style={styles.infoList}>
          <InfoRow label={t('profile.balance')} value={`${balance.toFixed(3)} CLB`} valueColor={theme.colors.accent} />
          <InfoRow
            label={t('profile.speed')}
            value={`${(status?.currentThs ?? 0).toFixed(2)} Th/s`}
            valueColor={theme.colors.positive}
          />
          <InfoRow label={t('profile.streak')} value={t('streak.days', { count: status?.streak ?? account?.streak ?? 0 })} last />
        </Card>

        <SectionLabel>{t('profile.badges')}</SectionLabel>
        {badges ? (
          <>
            <Text style={styles.badgeCount}>{t('profile.badgesCount', { earned: earnedCount(badges), total: badges.length })}</Text>
            <BadgeGrid badges={badges} newIds={newBadgeIds} onPressBadge={(id, earned) => earned && setShareCard(badgeCard(id))} />
          </>
        ) : (
          badgesFailed && <Text style={styles.error}>{t('profile.badgeLoadFailed')}</Text>
        )}

        <SectionLabel>{t('profile.rewards')}</SectionLabel>
        <Card style={styles.infoList}>
          <InfoRow
            label={t('profile.vip')}
            value={vipDays > 0 ? t('profile.vipDays', { count: vipDays }) : t('profile.vipNone')}
            valueColor={vipDays > 0 ? theme.colors.accent : undefined}
          />
          <InfoRow
            label={t('profile.frame')}
            value={frameKey ? t(frameKey) : t('profile.frameNone')}
            valueColor={frameKey ? theme.colors.accent : undefined}
            last
          />
        </Card>

        <SectionLabel>{t('profile.language')}</SectionLabel>
        <Segmented value={preference} options={languageOptions} onChange={setPreference} />

        <SectionLabel>{t('profile.notifications')}</SectionLabel>
        <Card style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.rowTitle}>{t('profile.notif.reminders')}</Text>
            <Text style={styles.rowHint}>
              {permission === 'denied' ? t('profile.notif.blocked') : t('profile.notif.remindersHint')}
            </Text>
          </View>
          <Switch
            value={notifOn}
            onValueChange={onToggleNotifications}
            trackColor={{ true: theme.colors.accent, false: theme.colors.ringTrack }}
            thumbColor={theme.colors.text}
          />
        </Card>

        <SectionLabel>{t('profile.help')}</SectionLabel>
        <LinkRow
          label={t('profile.support')}
          detail={SUPPORT_EMAIL}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />

        <SectionLabel>{t('profile.legal')}</SectionLabel>
        <LinkRow label={t('profile.privacy')} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)} />
        <LinkRow label={t('profile.terms')} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />

        <SectionLabel>{t('profile.account')}</SectionLabel>
        <Button label={t('profile.signOut')} onPress={onSignOut} variant="ghost" style={styles.accountButton} />
        <Button
          label={t('profile.delete.title')}
          onPress={onDelete}
          variant="danger"
          loading={deleting}
          style={styles.accountButton}
        />
        {deleteError && <Text style={styles.error}>{deleteError}</Text>}
        {deleting && <ActivityIndicator color={theme.colors.text} />}

        {!!version && <Text style={styles.version}>{t('profile.version', { version })}</Text>}
      </ScrollView>
      <ShareCardModal card={shareCard} onClose={() => setShareCard(null)} />
    </SafeAreaView>
  );
}

function InfoRow({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoKey}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function LinkRow({
  label,
  detail,
  onPress,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
}) {
  const icon: ComponentProps<typeof Ionicons>['name'] = 'chevron-forward';
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [styles.link, pressed && { opacity: 0.8 }]}>
      <Text style={styles.linkLabel}>{label}</Text>
      <View style={styles.linkRight}>
        {detail ? <Text style={styles.linkDetail}>{detail}</Text> : null}
        <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl + 16 },
  identity: { alignItems: 'center', marginBottom: theme.spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarText: { color: theme.colors.background, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xxl },
  name: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg },
  since: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 2 },

  accountCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.ringTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: { flex: 1 },
  accountProvider: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.sm },
  accountEmail: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 2 },

  infoList: { paddingVertical: theme.spacing.xs, marginBottom: theme.spacing.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  infoKey: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm },
  infoValue: { color: theme.colors.text, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.sm },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  switchText: { flex: 1 },
  rowTitle: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 0.5 },
  rowHint: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 2 },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg - 2,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  linkLabel: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.md - 0.5 },
  linkRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 1 },
  linkDetail: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, flexShrink: 1 },

  accountButton: { marginBottom: theme.spacing.sm },
  badgeCount: { color: theme.colors.textMuted, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs, marginBottom: theme.spacing.sm },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.sm },
  version: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSizes.xs,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
