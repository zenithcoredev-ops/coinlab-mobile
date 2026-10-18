import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, ScreenTitle, SectionLabel } from '@/components/ui';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useNow } from '@/hooks/use-now';
import { useI18n } from '@/i18n';
import { LEAGUE_ICONS, LEAGUE_NAME_KEYS, MEDALS, RESULT_KEYS } from '@/lib/league';
import {
  DIAMOND_LEAGUE,
  entryProgress,
  formatWeekCountdown,
  getLeague,
  LeagueResult,
  LeagueStanding,
  LeagueView,
  msUntilWeekEnd,
} from '@/services/league-api';
import { theme } from '@/theme';

const RESULT_SEEN_KEY = 'coinlab_league_result_seen';

export default function LeagueScreen() {
  const { t } = useI18n();
  const { auth } = useSession();
  const { refresh: refreshMining } = useMining();
  const token = auth?.token ?? null;

  const [view, setView] = useState<LeagueView | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [seenWeekEnd, setSeenWeekEnd] = useState<string | null>(null);
  const now = useNow(30_000);

  useEffect(() => {
    AsyncStorage.getItem(RESULT_SEEN_KEY)
      .then(setSeenWeekEnd)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const next = await getLeague(token);
      setView(next);
      setFetchedAt(Date.now());
      setLoadError(false);
      // A promotion or demotion changes the league bonus in the mining speed.
      refreshMining();
    } catch {
      setLoadError(true);
    }
  }, [token, refreshMining]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // The week ended (Monday 00:00 UTC) while the screen was open: standings are new.
  const weekLeft = view ? msUntilWeekEnd(view, now - fetchedAt) : 0;
  const rolledOver = view?.state === 'active' && weekLeft === 0;
  useEffect(() => {
    if (rolledOver) load();
  }, [rolledOver, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function dismissResult(result: LeagueResult) {
    setSeenWeekEnd(result.weekEnd);
    AsyncStorage.setItem(RESULT_SEEN_KEY, result.weekEnd).catch(() => {});
  }

  const result = view?.lastResult && view.lastResult.weekEnd !== seenWeekEnd ? view.lastResult : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />}>
        <ScreenHeader />
        <ScreenTitle title={t('league.title')} subtitle={t('league.subtitle')} />

        {!view ? (
          loadError ? (
            <View style={styles.centerBlock}>
              <Text style={styles.error}>{t('league.loadFailed')}</Text>
              <Button label={t('common.retry')} onPress={load} variant="ghost" style={styles.retry} />
            </View>
          ) : (
            <ActivityIndicator color={theme.colors.text} style={styles.centerBlock} />
          )
        ) : (
          <>
            <HowItWorks />
            {result && <ResultBanner result={result} onDismiss={() => dismissResult(result)} />}
            {view.state === 'locked' && <LockedCard entry={view.entry} />}
            {view.state === 'tournament' && (
              <Card style={styles.block}>
                <Text style={styles.cardTitle}>🏆 {t('league.tournamentActive')}</Text>
              </Card>
            )}
            {view.state === 'active' && <ActiveLeague view={view} msLeft={weekLeft} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = ['league.how.step1', 'league.how.step2', 'league.how.step3'] as const;
  return (
    <Card style={styles.block}>
      <Text style={styles.cardTitle}>{t('league.how.title')}</Text>
      {steps.map((key, i) => (
        <View key={key} style={styles.howRow}>
          <View style={styles.howNum}>
            <Text style={styles.howNumText}>{i + 1}</Text>
          </View>
          <Text style={styles.howText}>{t(key)}</Text>
        </View>
      ))}
      <Text style={styles.note}>{t('league.how.note')}</Text>
    </Card>
  );
}

function ResultBanner({ result, onDismiss }: { result: LeagueResult; onDismiss: () => void }) {
  const { t } = useI18n();
  const text = t(RESULT_KEYS[result.resultType], {
    league: t(LEAGUE_NAME_KEYS[result.toLeague]),
    rank: result.rank ?? '-',
    points: result.points.toFixed(2),
  });
  const tone = result.resultType === 'demote' ? styles.bannerDemote : result.resultType === 'promote' ? styles.bannerPromote : null;
  return (
    <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('league.result.dismiss')}>
      <View style={[styles.banner, tone]}>
        <Text style={styles.bannerText}>{text}</Text>
      </View>
    </Pressable>
  );
}

function LockedCard({ entry }: { entry: LeagueView['entry'] }) {
  const { t } = useI18n();
  const progress = entryProgress(entry);
  return (
    <Card style={styles.block}>
      <Text style={styles.lockIcon}>🔒</Text>
      <Text style={styles.cardTitle}>{t('league.locked.title')}</Text>
      <Text style={styles.howText}>{t('league.locked.body', { required: entry.required })}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {t('league.locked.progress', { balance: Math.min(entry.balance, entry.required).toFixed(2), required: entry.required })}
      </Text>
    </Card>
  );
}

function ActiveLeague({ view, msLeft }: { view: LeagueView; msLeft: number }) {
  const { t } = useI18n();
  const bands = view.bands!;
  const standings = view.standings ?? [];
  const isDiamond = view.league === DIAMOND_LEAGUE;
  const lowerLeague = view.league > 0 ? t(LEAGUE_NAME_KEYS[view.league - 1]) : null;

  let requirement: string;
  if (isDiamond) requirement = t('league.diamondTop', { count: Math.max(bands.tournamentCount, 1) });
  else if (bands.promoteCount > 0) requirement = t('league.promoteReq', { count: bands.promoteCount, size: view.groupSize ?? 0 });
  else requirement = t('league.promoteReqNone');

  const { days, hours, minutes } = formatWeekCountdown(msLeft);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.leagueIcon}>{LEAGUE_ICONS[view.league]}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.leagueName}>{t(LEAGUE_NAME_KEYS[view.league])}</Text>
          <Text style={styles.headerSub}>{t('league.bonus', { ths: view.speedBonus.toFixed(2) })}</Text>
          <Text style={styles.headerSub}>{requirement}</Text>
          <Text style={styles.headerSub}>{t('league.weekEnds', { time: t('league.time', { days, hours, minutes }) })}</Text>
        </View>
      </View>

      {view.yourRank !== undefined && (
        <Text style={styles.yourRank}>{t('league.yourRank', { rank: view.yourRank, size: view.groupSize ?? 0 })}</Text>
      )}

      <SectionLabel>{t('league.title')}</SectionLabel>
      {standings.map((row, i) => (
        <StandingRow key={row.rank} row={row} previous={standings[i - 1]} lowerLeague={lowerLeague} />
      ))}
    </>
  );
}

function StandingRow({ row, previous, lowerLeague }: { row: LeagueStanding; previous?: LeagueStanding; lowerLeague: string | null }) {
  const { t } = useI18n();
  const medal = MEDALS[row.rank];

  // Zone labels sit on the boundary: the first row after the promotion band, and the first demotion row.
  const afterPromotion = previous?.zone === 'promote' && row.zone !== 'promote';
  const startsDemotion = row.zone === 'demote' && previous?.zone !== 'demote';

  return (
    <>
      {afterPromotion && <Text style={[styles.zoneLabel, { color: theme.colors.positive }]}>{t('league.zone.promote')}</Text>}
      {startsDemotion && (
        <Text style={[styles.zoneLabel, { color: theme.colors.danger }]}>
          {lowerLeague ? t('league.zone.demoteTo', { league: lowerLeague.toUpperCase() }) : t('league.zone.demote')}
        </Text>
      )}
      <View
        style={[
          styles.row,
          row.isYou && styles.rowYou,
          row.zone === 'promote' && styles.rowPromote,
          row.zone === 'demote' && styles.rowDemote,
        ]}>
        <Text style={[styles.rank, row.zone === 'promote' && { color: theme.colors.positive }, row.zone === 'demote' && { color: theme.colors.danger }]}>
          {medal ?? row.rank}
        </Text>
        <View style={[styles.avatar, row.isYou && styles.avatarYou]}>
          <Text style={[styles.avatarText, row.isYou && styles.avatarTextYou]}>{row.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {row.isYou ? t('league.you') : row.name}
        </Text>
        <Text style={styles.points}>{row.points.toFixed(2)}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl + 16 },
  centerBlock: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, textAlign: 'center' },
  retry: { marginTop: theme.spacing.lg, alignSelf: 'center' },
  block: { marginBottom: theme.spacing.md },

  cardTitle: { color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md, marginBottom: theme.spacing.sm },
  howRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm, alignItems: 'flex-start' },
  howNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howNumText: { color: theme.colors.accent, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.xs },
  howText: { flex: 1, color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19 },
  note: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, lineHeight: 17, marginTop: theme.spacing.md },

  lockIcon: { fontSize: 28, marginBottom: theme.spacing.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: theme.colors.ringTrack, marginTop: theme.spacing.md, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 4 },
  progressText: { color: theme.colors.accent, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs + 0.5, marginTop: theme.spacing.sm },

  banner: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md + 2,
    marginBottom: theme.spacing.md,
  },
  bannerPromote: { backgroundColor: theme.colors.positiveSoft, borderColor: theme.colors.positiveBorder },
  bannerDemote: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },
  bannerText: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, lineHeight: 19 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  leagueIcon: { fontSize: 38 },
  headerInfo: { flex: 1, minWidth: 0 },
  leagueName: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg - 2 },
  headerSub: { color: theme.colors.textMuted, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs, marginTop: 3 },
  yourRank: { color: theme.colors.accent, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.sm, marginBottom: theme.spacing.sm },

  zoneLabel: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.fontSizes.xs,
    letterSpacing: 0.9,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    marginBottom: 6,
  },
  rowYou: { backgroundColor: theme.colors.accentSoft },
  rowPromote: { borderLeftColor: theme.colors.positive },
  rowDemote: { borderLeftColor: theme.colors.danger },
  rank: { width: 26, textAlign: 'center', color: theme.colors.textMuted, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.sm },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.ringTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarYou: { backgroundColor: theme.colors.positive },
  avatarText: { color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm },
  avatarTextYou: { color: theme.colors.background },
  name: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 1 },
  points: { color: theme.colors.accent, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.sm },
});
