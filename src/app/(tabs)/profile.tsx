import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ComponentProps, ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeDetailModal } from '@/components/badge-detail-modal';
import { BadgeGrid } from '@/components/badge-grid';
import { BACKGROUND_IMAGES, BACKGROUND_SHADES } from '@/components/home/backgrounds';
import { ScreenBackground } from '@/components/home/screen-background';
import { NeonCard } from '@/components/neon-card';
import { NotificationTypeSettings } from '@/components/notification-type-settings';
import { ShareCardModal } from '@/components/share-card-modal';
import { SupportModal } from '@/components/support-modal';
import { ScreenHeader } from '@/components/screen-header';
import { TextScrim } from '@/components/text-scrim';
import { Segmented } from '@/components/ui';
import { WidgetDiagnostics } from '@/components/widget-diagnostics';
import { WidgetWeatherSetting } from '@/components/widget-weather-setting';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/constants/config';
import { useAds } from '@/context/ads';
import { useMining } from '@/context/mining';
import { useNotifications } from '@/context/notifications';
import { useSession } from '@/context/session';
import { useI18n } from '@/i18n';
import type { LanguagePreference } from '@/i18n';
import { formatMonthYear } from '@/lib/dates';
import { FRAME_NAME_KEYS, LEAGUE_NAME_KEYS } from '@/lib/league';
import { clbPerHourOf, formatClbPerHour, statusClbPerHour } from '@/lib/mining-math';
import { badgeCard, ShareCard } from '@/lib/share';
import { Badge, BadgeId, earnedCount, getBadges, newlyEarned, vipDaysLeft } from '@/services/badges-api';
import { Account, deleteAccount, getAccount } from '@/services/me-api';
import { theme } from '@/theme';

// If this screen throws while drawing, the tab shows a retry screen instead of the app closing.
export { ScreenError as ErrorBoundary } from '@/components/screen-error';

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
  const [badgeOpen, setBadgeOpen] = useState<{ id: BadgeId; earnedAt: string | null } | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const { active: notifOn, permission, setEnabled, refreshPermission } = useNotifications();
  const { privacyOptionsRequired, openPrivacyOptions } = useAds();
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
  const memberSince = formatMonthYear(account?.createdAt, language);

  const vipDays = vipDaysLeft(account?.vipUntil ?? null, Date.now());
  const frameKey = account?.equippedFrame ? FRAME_NAME_KEYS[account.equippedFrame] : undefined;
  const streak = status?.streak ?? account?.streak ?? 0;
  const league = account ? t(LEAGUE_NAME_KEYS[account.league]) : '–';
  // "Toplam gün" once the server sends it; until then the current speed, another stat it does send.
  const totalDays = typeof account?.totalCollectDays === 'number' ? account.totalCollectDays : null;
  const speed = formatClbPerHour(status ? statusClbPerHour(status) : clbPerHourOf(account?.clbPerHour, account?.currentThs ?? 0), language);

  const languageOptions: { value: LanguagePreference; label: string }[] = [
    { value: 'auto', label: t('profile.language.auto') },
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Türkçe' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed behind the list: the tab's picture when there is one, else the drawn topographic lines. */}
      <ScreenBackground variant="neon" image={BACKGROUND_IMAGES.profile} shade={BACKGROUND_SHADES.profile} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader />

        <NeonCard grid style={styles.block} testID="profile-card">
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || 'W'}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {account?.email ? (
                <Text style={styles.email} numberOfLines={1}>
                  {account.email}
                </Text>
              ) : null}
              {memberSince ? <Text style={styles.since}>{t('profile.memberSinceMonth', { date: memberSince })}</Text> : null}
            </View>
          </View>
          {vipDays > 0 || frameKey ? (
            <View style={styles.chips}>
              {vipDays > 0 ? <Chip text={`${t('profile.vip')}: ${t('profile.vipDays', { count: vipDays })}`} /> : null}
              {frameKey ? <Chip text={t(frameKey)} /> : null}
            </View>
          ) : null}
        </NeonCard>

        <View style={styles.stats}>
          <StatCard testID="stat-streak" value={t('streak.days', { count: streak })} label={t('profile.stat.streak')} gold />
          <StatCard testID="stat-league" value={league} label={t('profile.stat.league')} />
          {totalDays !== null ? (
            <StatCard testID="stat-days" value={String(totalDays)} label={t('profile.stat.totalDays')} />
          ) : (
            <StatCard testID="stat-speed" value={speed} label={t('profile.stat.speed')} />
          )}
        </View>

        <NeonCard tone="gold" style={styles.block} testID="badges-card">
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{t('profile.badges')}</Text>
            {badges ? <Text style={styles.cardMeta}>{t('profile.badgesCount', { earned: earnedCount(badges), total: badges.length })}</Text> : null}
          </View>
          {badges ? (
            <BadgeGrid
              badges={badges}
              newIds={newBadgeIds}
              onPressBadge={(id) => setBadgeOpen({ id, earnedAt: badges.find((b) => b.id === id)?.earnedAt ?? null })}
            />
          ) : badgesFailed ? (
            <Text style={styles.error}>{t('profile.badgeLoadFailed')}</Text>
          ) : (
            <ActivityIndicator color={theme.colors.accent} />
          )}
        </NeonCard>

        <NeonCard style={styles.block} testID="notifications-card">
          <Text style={styles.cardTitle}>{t('profile.notif.title')}</Text>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{t('profile.notif.reminders')}</Text>
              <Text style={styles.rowHint}>{permission === 'denied' ? t('profile.notif.blocked') : t('profile.notif.remindersHint')}</Text>
            </View>
            <Switch
              testID="notif-main"
              value={notifOn}
              onValueChange={onToggleNotifications}
              trackColor={{ true: theme.colors.neon, false: theme.colors.ringTrack }}
              thumbColor={theme.colors.text}
              accessibilityLabel={t('profile.notif.reminders')}
            />
          </View>
          <View style={styles.separator} />
          <NotificationTypeSettings embedded />
        </NeonCard>

        <WidgetWeatherSetting />

        <NeonCard style={styles.block} testID="settings-card">
          <Text style={styles.cardTitle}>{t('profile.settings')}</Text>
          <Text style={styles.rowTitle}>{t('profile.language')}</Text>
          <View style={styles.language}>
            <Segmented value={preference} options={languageOptions} onChange={setPreference} />
          </View>
          <SettingsRow icon="help-buoy-outline" label={t('profile.support')} onPress={() => setSupportOpen(true)} />
          <SettingsRow icon="shield-checkmark-outline" label={t('profile.privacy')} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL(language))} />
          <SettingsRow icon="document-text-outline" label={t('profile.terms')} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL(language))} />
          {privacyOptionsRequired && <SettingsRow icon="options-outline" label={t('profile.privacyOptions')} onPress={openPrivacyOptions} />}
          <SettingsRow icon="trash-outline" label={t('profile.delete.title')} onPress={onDelete} danger busy={deleting} />
          <SettingsRow icon="log-out-outline" label={t('profile.signOut')} onPress={onSignOut} last />
          {deleteError && <Text style={styles.error}>{deleteError}</Text>}
        </NeonCard>

        <TextScrim style={styles.footerScrim}>
          <Text style={styles.footer}>{t('profile.weather.attribution')}</Text>
          {!!version && <Text style={styles.footer}>{t('profile.version', { version })}</Text>}
        </TextScrim>

        <WidgetDiagnostics />
      </ScrollView>
      <BadgeDetailModal
        badge={badgeOpen}
        onClose={() => setBadgeOpen(null)}
        onShare={(id) => {
          setBadgeOpen(null);
          setShareCard(badgeCard(id));
        }}
      />
      <ShareCardModal card={shareCard} onClose={() => setShareCard(null)} />
      <SupportModal visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </SafeAreaView>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

/** A small stat card: the value big, its label under it (gold for rewards like the streak). */
function StatCard({ value, label, gold, testID }: { value: string; label: string; gold?: boolean; testID?: string }) {
  return (
    <NeonCard tone={gold ? 'gold' : 'green'} grid style={styles.stat} testID={testID}>
      <Text style={[styles.statValue, gold && styles.statValueGold]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </NeonCard>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
  busy,
  last,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  busy?: boolean;
  last?: boolean;
}): ReactNode {
  const color = danger ? theme.colors.danger : theme.colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole={danger || last ? 'button' : 'link'}
      style={({ pressed }) => [styles.settingsRow, !last && styles.settingsDivider, pressed && { opacity: 0.75 }]}>
      <Ionicons name={icon} size={20} color={danger ? theme.colors.danger : theme.colors.neon} />
      <Text style={[styles.settingsLabel, { color }, danger && styles.settingsDanger]}>{label}</Text>
      {busy ? <ActivityIndicator color={theme.colors.text} /> : <Ionicons name="chevron-forward" size={18} color={theme.colors.tabInactive} />}
    </Pressable>
  );
}

// Glow only on titles and big numbers, always behind the text.
const glow = (color: string) => ({ textShadowColor: color, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } });

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgDeep },
  scroll: { paddingHorizontal: theme.spacing.lg + 2, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xxl + 16 },
  block: { marginBottom: theme.spacing.lg },
  flex: { flex: 1 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xxl - 4 },
  identityText: { flex: 1, minWidth: 0 },
  name: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl, ...glow(theme.colors.neonGlow) },
  email: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginTop: 2 },
  since: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  chip: { borderWidth: 1, borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.xs },

  stats: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  stat: { flex: 1, alignItems: 'center', paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.sm },
  statValue: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg, ...glow(theme.colors.neonGlow) },
  statValueGold: { color: theme.colors.accent, ...glow(theme.colors.goldGlow) },
  statLabel: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 4 },

  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  cardTitle: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg - 1, marginBottom: theme.spacing.sm },
  cardMeta: { flexShrink: 1, color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, textAlign: 'right' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  rowTitle: { color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md - 0.5 },
  rowHint: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.ringTrack, marginTop: theme.spacing.md },

  language: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md + 2 },
  settingsDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.ringTrack },
  settingsLabel: { flex: 1, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.md - 0.5 },
  // The theme's soft red (AA on the card): clearly different, not shouting.
  settingsDanger: { fontFamily: theme.fonts.bodyMedium },

  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.sm },
  footerScrim: { marginTop: theme.spacing.sm },
  footer: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, textAlign: 'center', marginTop: theme.spacing.sm },
});
