import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ShareCardModal } from '@/components/share-card-modal';
import { Button, Card, ScreenTitle, SectionLabel } from '@/components/ui';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useLiveBalance } from '@/hooks/use-live-balance';
import { useNow } from '@/hooks/use-now';
import { useI18n } from '@/i18n';
import {
  FRAME_COLORS,
  FRAME_NAME_KEYS,
  LEAGUE_ICONS,
  LEAGUE_NAME_KEYS,
  MEDALS,
  RESULT_KEYS,
  STAGE_NAME_KEYS,
} from '@/lib/league';
import { leagueWeekEndParams } from '@/lib/league-week';
import { promotionCard, ShareCard, tournamentCard } from '@/lib/share';
import {
  DIAMOND_LEAGUE,
  entryProgress,
  formatWeekCountdown,
  getLeague,
  isTournamentLive,
  LeagueResult,
  LiveTournamentLeagueView,
  LeagueStanding,
  LeagueView,
  msUntilWeekEnd,
  TournamentResult,
  TournamentRewardRow,
  TournamentStage,
} from '@/services/league-api';
import { theme } from '@/theme';

const RESULT_SEEN_KEY = 'coinlab_league_result_seen';
const TOURNAMENT_SEEN_KEY = 'coinlab_tournament_result_seen';
const NEXT_STAGE: Record<TournamentStage, TournamentStage | null> = { qf: 'sf', sf: 'final', final: null };

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
  const [seenTournament, setSeenTournament] = useState<string | null>(null);
  const [share, setShare] = useState<{ card: ShareCard; detail?: string } | null>(null);
  const now = useNow(30_000);

  useEffect(() => {
    AsyncStorage.getItem(RESULT_SEEN_KEY)
      .then(setSeenWeekEnd)
      .catch(() => {});
    AsyncStorage.getItem(TOURNAMENT_SEEN_KEY)
      .then(setSeenTournament)
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
  const rolledOver = (view?.state === 'active' || (!!view && isTournamentLive(view))) && weekLeft === 0;
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

  function dismissTournamentResult(result: TournamentResult) {
    setSeenTournament(result.id);
    AsyncStorage.setItem(TOURNAMENT_SEEN_KEY, result.id).catch(() => {});
  }

  const result = view?.lastResult && view.lastResult.weekEnd !== seenWeekEnd ? view.lastResult : null;
  const tournamentResult = view?.tournamentResult && view.tournamentResult.id !== seenTournament ? view.tournamentResult : null;

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
            {tournamentResult && (
              <TournamentResultBanner
                result={tournamentResult}
                onDismiss={() => dismissTournamentResult(tournamentResult)}
                onShare={(card, detail) => setShare({ card, detail })}
              />
            )}
            {result && (
              <ResultBanner
                result={result}
                onDismiss={() => dismissResult(result)}
                onShare={(card, detail) => setShare({ card, detail })}
              />
            )}
            {view.state === 'locked' && <LockedCard entry={view.entry} />}
            {view.state === 'tournament' &&
              (isTournamentLive(view) ? (
                <TournamentStageView view={view} msLeft={weekLeft} />
              ) : (
                <View style={styles.banner}>
                  <Text style={styles.bannerText}>{t('tournament.pending')}</Text>
                </View>
              ))}
            {view.state === 'active' && <ActiveLeague view={view} msLeft={weekLeft} />}
            {(view.league === DIAMOND_LEAGUE || view.state === 'tournament') && (
              <TournamentCard rewards={view.tournamentRewards} />
            )}
          </>
        )}
      </ScrollView>
      <ShareCardModal card={share?.card ?? null} detail={share?.detail} onClose={() => setShare(null)} />
    </SafeAreaView>
  );
}

function HowItWorks() {
  const { t, language } = useI18n();
  const weekEnd = leagueWeekEndParams(t, language, new Date());
  const steps = ['league.how.step1', 'league.how.step2', 'league.how.step3', 'league.how.step4'] as const;
  return (
    <Card style={styles.block}>
      <Text style={styles.cardTitle}>{t('league.how.title')}</Text>
      {steps.map((key, i) => (
        <View key={key} style={styles.howRow}>
          <View style={styles.howNum}>
            <Text style={styles.howNumText}>{i + 1}</Text>
          </View>
          <Text style={styles.howText}>{t(key, key === 'league.how.step3' ? weekEnd : undefined)}</Text>
        </View>
      ))}
      <Text style={styles.note}>{t('league.how.note')}</Text>
    </Card>
  );
}

function ShareButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.bannerShare}>
      <Text style={styles.bannerShareText}>{t('share.share')}</Text>
    </Pressable>
  );
}

function ResultBanner({
  result,
  onDismiss,
  onShare,
}: {
  result: LeagueResult;
  onDismiss: () => void;
  onShare: (card: ShareCard, detail?: string) => void;
}) {
  const { t } = useI18n();
  const card = promotionCard(result);
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
        {card && <ShareButton onPress={() => onShare(card, t(LEAGUE_NAME_KEYS[result.toLeague]))} />}
      </View>
    </Pressable>
  );
}

function LockedCard({ entry }: { entry: LeagueView['entry'] }) {
  const { t } = useI18n();
  // Live like the Mine screen; the league snapshot's balance until the mining status arrives.
  const balance = useLiveBalance() ?? entry.balance;
  const progress = entryProgress({ ...entry, balance });
  return (
    <Card style={styles.block}>
      <Text style={styles.lockIcon}>🔒</Text>
      <Text style={styles.cardTitle}>{t('league.locked.title')}</Text>
      <Text style={styles.howText}>{t('league.locked.body', { required: entry.required })}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {t('league.locked.progress', { balance: Math.min(balance, entry.required).toFixed(2), required: entry.required })}
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
  const zoneLabels: ZoneLabels = {
    promote: t('league.zone.promote'),
    demote: lowerLeague ? t('league.zone.demoteTo', { league: lowerLeague.toUpperCase() }) : t('league.zone.demote'),
  };

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
        <StandingRow key={row.rank} row={row} previous={standings[i - 1]} labels={zoneLabels} />
      ))}
    </>
  );
}

type ZoneLabels = { promote: string; demote: string };

function StandingRow({
  row,
  previous,
  labels,
}: {
  row: LeagueStanding;
  previous?: LeagueStanding;
  labels: ZoneLabels;
}) {
  const { t } = useI18n();
  const medal = MEDALS[row.rank];

  // Zone labels sit on the boundary: the first row after the promotion band, and the first demotion row.
  const afterPromotion = previous?.zone === 'promote' && row.zone !== 'promote';
  const startsDemotion = row.zone === 'demote' && previous?.zone !== 'demote';

  return (
    <>
      {afterPromotion && <Text style={[styles.zoneLabel, { color: theme.colors.positive }]}>{labels.promote}</Text>}
      {startsDemotion && <Text style={[styles.zoneLabel, { color: theme.colors.danger }]}>{labels.demote}</Text>}
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
        <View
          style={[
            styles.avatar,
            row.isYou && styles.avatarYou,
            row.frame && FRAME_COLORS[row.frame] ? { borderWidth: 2, borderColor: FRAME_COLORS[row.frame] } : null,
          ]}>
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

function rewardText(t: ReturnType<typeof useI18n>['t'], reward: { clb: number; vipDays: number; frame: string }) {
  const frameKey = FRAME_NAME_KEYS[reward.frame];
  return t('tournament.rewardLine', {
    clb: reward.clb,
    days: reward.vipDays,
    frame: frameKey ? t(frameKey) : reward.frame,
  });
}

function TournamentCard({ rewards }: { rewards: TournamentRewardRow[] }) {
  const { t } = useI18n();
  const placeKeys = ['tournament.place.1', 'tournament.place.2', 'tournament.place.3'] as const;
  return (
    <Card style={styles.tournamentCard}>
      <Text style={styles.cardTitle}>💎 {t('tournament.title')}</Text>
      <Text style={styles.howText}>{t('tournament.desc')}</Text>
      <SectionLabel>{t('tournament.rewardsTitle')}</SectionLabel>
      {rewards.map((r) => (
        <View key={r.rank} style={styles.rewardRow}>
          <Text style={styles.rewardPlace}>{placeKeys[r.rank - 1] ? t(placeKeys[r.rank - 1]) : r.rank}</Text>
          <Text style={styles.rewardValue}>{rewardText(t, r)}</Text>
        </View>
      ))}
      <Text style={styles.note}>{t('tournament.note')}</Text>
    </Card>
  );
}

function TournamentResultBanner({
  result,
  onDismiss,
  onShare,
}: {
  result: TournamentResult;
  onDismiss: () => void;
  onShare: (card: ShareCard, detail?: string) => void;
}) {
  const { t } = useI18n();
  const card = tournamentCard(result);
  const stage = t(STAGE_NAME_KEYS[result.stage]);
  let text: string;
  let tone = null;
  if (result.outcome === 'advanced') {
    const next = NEXT_STAGE[result.stage];
    text = t('tournament.result.advanced', { stage, next: next ? t(STAGE_NAME_KEYS[next]) : stage });
    tone = styles.bannerPromote;
  } else if (result.outcome === 'eliminated') {
    text = t('tournament.result.eliminated', { stage });
    tone = styles.bannerDemote;
  } else if (result.reward) {
    const placeKey = (['tournament.place.1', 'tournament.place.2', 'tournament.place.3'] as const)[result.rank - 1];
    text = t('tournament.result.finalReward', { place: placeKey ? t(placeKey) : result.rank, reward: rewardText(t, result.reward) });
    tone = styles.bannerPromote;
  } else {
    text = t('tournament.result.finalNone', { rank: result.rank });
  }
  return (
    <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('league.result.dismiss')}>
      <View style={[styles.banner, tone]}>
        <Text style={styles.bannerText}>{text}</Text>
        {card && result.reward && <ShareButton onPress={() => onShare(card, rewardText(t, result.reward!))} />}
      </View>
    </Pressable>
  );
}

function TournamentStageView({ view, msLeft }: { view: LiveTournamentLeagueView; msLeft: number }) {
  const { t } = useI18n();
  const tour = view.tournament;
  const { days, hours, minutes } = formatWeekCountdown(msLeft);
  const labels: ZoneLabels = { promote: t('tournament.zone.advance'), demote: t('tournament.zone.eliminated') };

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.leagueIcon}>🏆</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.leagueName}>{t(STAGE_NAME_KEYS[tour.stage])}</Text>
          <Text style={styles.headerSub}>{t('tournament.stageOf', { n: tour.stageNumber, total: tour.stageCount })}</Text>
          <Text style={styles.headerSub}>
            {tour.stage === 'final'
              ? t('tournament.finalRule')
              : t('tournament.advanceRule', { count: tour.advanceCount, size: tour.size })}
          </Text>
          <Text style={styles.headerSub}>{t('tournament.stageEnds', { time: t('league.time', { days, hours, minutes }) })}</Text>
        </View>
      </View>
      <Text style={styles.yourRank}>{t('league.yourRank', { rank: tour.yourRank, size: tour.size })}</Text>
      {tour.standings.map((row, i) => (
        <StandingRow key={row.rank} row={row} previous={tour.standings[i - 1]} labels={labels} />
      ))}
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
  bannerShare: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
  },
  bannerShareText: { color: theme.colors.accentInk, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.sm },
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
  tournamentCard: { marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: 5 },
  rewardPlace: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },
  rewardValue: { flex: 1, textAlign: 'right', color: theme.colors.accent, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs + 0.5 },
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
