import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsibleCard } from '@/components/collapsible-card';
import { BACKGROUND_IMAGES } from '@/components/home/backgrounds';
import { NeonBar } from '@/components/home/neon-bar';
import { ScreenBackground } from '@/components/home/screen-background';
import { NeonCard } from '@/components/neon-card';
import { ScreenHeader } from '@/components/screen-header';
import { ShareCardModal } from '@/components/share-card-modal';
import { Button } from '@/components/ui';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useLiveBalance } from '@/hooks/use-live-balance';
import { useNow } from '@/hooks/use-now';
import { useI18n } from '@/i18n';
import { FRAME_COLORS, FRAME_NAME_KEYS, LEAGUE_NAME_KEYS, RESULT_KEYS, STAGE_NAME_KEYS } from '@/lib/league';
import { ListItem, rankStatus, RankStatus, shortCountdown, standingsList } from '@/lib/league-view';
import { leagueWeekEndParams } from '@/lib/league-week';
import { clbPerHourOf, formatClbPerHour, formatDecimal } from '@/lib/mining-math';
import { promotionCard, ShareCard, tournamentCard } from '@/lib/share';
import {
  DIAMOND_LEAGUE,
  entryProgress,
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
import { saveLeagueSnapshot } from '@/services/league-cache';
import { theme } from '@/theme';

// If this screen throws while drawing, the tab shows a retry screen instead of the app closing.
export { ScreenError as ErrorBoundary } from '@/components/screen-error';

const RESULT_SEEN_KEY = 'coinlab_league_result_seen';
const TOURNAMENT_SEEN_KEY = 'coinlab_tournament_result_seen';
const NEXT_STAGE: Record<TournamentStage, TournamentStage | null> = { qf: 'sf', sf: 'final', final: null };

export default function LeagueScreen() {
  const { t, language } = useI18n();
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
      saveLeagueSnapshot(next).catch(() => {});
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
      {/* Fixed behind the list: the tab's picture when there is one, else the drawn topographic lines. */}
      <ScreenBackground variant="neon" image={BACKGROUND_IMAGES.league} shade="graded" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />}>
        <ScreenHeader />
        <TitleBlock />

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
            {tournamentResult && (
              <TournamentResultBanner
                result={tournamentResult}
                onDismiss={() => dismissTournamentResult(tournamentResult)}
                onShare={(card, detail) => setShare({ card, detail })}
              />
            )}
            {result && (
              <ResultBanner result={result} onDismiss={() => dismissResult(result)} onShare={(card, detail) => setShare({ card, detail })} />
            )}
            {view.state === 'locked' && <LockedCard entry={view.entry} />}
            {view.state === 'tournament' &&
              (isTournamentLive(view) ? (
                <TournamentStageView view={view} msLeft={weekLeft} />
              ) : (
                <NeonCard tone="gold" style={styles.block}>
                  <Text style={styles.bannerText}>{t('tournament.pending')}</Text>
                </NeonCard>
              ))}
            {view.state === 'active' && <ActiveLeague view={view} msLeft={weekLeft} />}
            {(view.league === DIAMOND_LEAGUE || view.state === 'tournament') && <TournamentCard rewards={view.tournamentRewards} />}
            <HowItWorks />
          </>
        )}
      </ScrollView>
      <ShareCardModal card={share?.card ?? null} detail={share?.detail} onClose={() => setShare(null)} />
    </SafeAreaView>
  );
}

/** "Haftalık lig" and when the new week starts, on the user's clock. */
function TitleBlock() {
  const { t, language } = useI18n();
  const { day, time } = leagueWeekEndParams(t, language, new Date());
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title} accessibilityRole="header">
        {t('league.title')}
      </Text>
      <Text style={styles.subtitle}>{t('league.weekStarts', { day: language === 'tr' ? day.toLocaleLowerCase('tr') : day, time })}</Text>
    </View>
  );
}

function HowItWorks() {
  const { t, language } = useI18n();
  const weekEnd = leagueWeekEndParams(t, language, new Date());
  const steps = ['league.how.step1', 'league.how.step2', 'league.how.step3', 'league.how.step4'] as const;
  return (
    <CollapsibleCard neon id="league" title={t('league.how.title')} style={styles.block}>
      {steps.map((key, i) => (
        <View key={key} style={styles.howRow}>
          <View style={styles.howNum}>
            <Text style={styles.howNumText}>{i + 1}</Text>
          </View>
          <Text style={styles.howText}>{t(key, key === 'league.how.step3' ? weekEnd : undefined)}</Text>
        </View>
      ))}
      <Text style={styles.note}>{t('league.how.note')}</Text>
    </CollapsibleCard>
  );
}

/** "Hafta bitişine 2g 14s" (or "5s 12d" on the last day). */
function useEndsIn(msLeft: number, kind: 'league' | 'tournament') {
  const { t } = useI18n();
  const { withDays, ...time } = shortCountdown(msLeft);
  if (kind === 'league') return withDays ? t('league.endsInDays', time) : t('league.endsInHours', time);
  return withDays ? t('tournament.endsInDays', time) : t('tournament.endsInHours', time);
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
  const { t, language } = useI18n();
  const card = promotionCard(result, language);
  const text = t(RESULT_KEYS[result.resultType], {
    league: t(LEAGUE_NAME_KEYS[result.toLeague]),
    rank: result.rank ?? '-',
    points: formatDecimal(result.points, 2, language),
  });
  return (
    <NeonCard tone={result.resultType === 'promote' ? 'gold' : 'green'} onPress={onDismiss} accessibilityLabel={t('league.result.dismiss')} style={styles.block}>
      <Text style={[styles.bannerText, result.resultType === 'demote' && styles.bannerDemote]}>{text}</Text>
      {card && <ShareButton onPress={() => onShare(card, t(LEAGUE_NAME_KEYS[result.toLeague]))} />}
    </NeonCard>
  );
}

function LockedCard({ entry }: { entry: LeagueView['entry'] }) {
  const { t, language } = useI18n();
  // Live like the Collect screen; the league snapshot's balance until the mining status arrives.
  const balance = useLiveBalance() ?? entry.balance;
  const progress = entryProgress({ ...entry, balance });
  return (
    <NeonCard grid style={styles.block} testID="league-locked">
      <View style={styles.lockedHead}>
        <View style={styles.iconBox}>
          <Ionicons name="lock-closed" size={22} color={theme.colors.neon} />
        </View>
        <Text style={styles.cardTitle}>{t('league.locked.title')}</Text>
      </View>
      <Text style={styles.body}>{t('league.locked.motivate')}</Text>
      <Text style={styles.body}>{t('league.locked.body', { required: entry.required })}</Text>
      <NeonBar progress={progress} height={14} style={styles.bar} />
      <Text style={styles.progressText}>
        {t('league.locked.progress', { balance: formatDecimal(Math.min(balance, entry.required), 2, language), required: entry.required })}
      </Text>
    </NeonCard>
  );
}

const STATUS_TEXT: Record<RankStatus['kind'], Parameters<ReturnType<typeof useI18n>['t']>[0]> = {
  inPromotion: 'league.status.inPromotion',
  toPromotion: 'league.status.toPromotion',
  inTournament: 'league.status.inTournament',
  toTournament: 'league.status.toTournament',
  inDemotion: 'league.status.inDemotion',
  noPromotion: 'league.promoteReqNone',
};

function ActiveLeague({ view, msLeft }: { view: LeagueView; msLeft: number }) {
  const { t, language } = useI18n();
  const bands = view.bands ?? { promoteCount: 0, demoteCount: 0, tournamentCount: 0 };
  const standings = view.standings ?? [];
  const isDiamond = view.league === DIAMOND_LEAGUE;
  const size = view.groupSize ?? standings.length;
  const endsIn = useEndsIn(msLeft, 'league');

  let requirement: string;
  if (isDiamond) requirement = t('league.diamondTop', { count: Math.max(bands.tournamentCount, 1) });
  else if (bands.promoteCount > 0) requirement = t('league.promoteReq', { count: bands.promoteCount, size });
  else requirement = t('league.promoteReqNone');

  const you = standings.find((s) => s.isYou);
  const status = rankStatus(you ?? (view.yourRank !== undefined ? { rank: view.yourRank, zone: null } : null), bands, isDiamond);
  const statusText = status ? t(STATUS_TEXT[status.kind], 'places' in status ? { count: status.places } : undefined) : null;

  return (
    <>
      <NeonCard tone="gold" grid style={styles.block} testID="league-card">
        <View style={styles.leagueRow}>
          <View style={[styles.iconBox, styles.iconBoxGold]}>
            <Ionicons name="shield" size={26} color={theme.colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.leagueName}>{t(LEAGUE_NAME_KEYS[view.league])}</Text>
            <Text style={styles.endsIn}>{endsIn}</Text>
          </View>
        </View>
        <Text style={styles.meta}>{t('league.bonus', { rate: formatClbPerHour(clbPerHourOf(view.speedBonusClbPerHour, view.speedBonus), language) })}</Text>
        {!isDiamond && (typeof view.nextSpeedBonusClbPerHour === 'number' || typeof view.nextSpeedBonus === 'number') && (
          <Text style={styles.meta}>
            {t('league.nextBonus', { rate: formatClbPerHour(clbPerHourOf(view.nextSpeedBonusClbPerHour, view.nextSpeedBonus ?? 0), language) })}
          </Text>
        )}
        <Text style={styles.meta}>{requirement}</Text>
      </NeonCard>

      {view.yourRank !== undefined && (
        <YourRankCard rank={view.yourRank} size={size} points={view.yourPoints ?? you?.points ?? 0} status={statusText} />
      )}

      <StandingsCard
        rows={standings}
        size={size}
        dividers={{ promote: t('league.divider.promote'), demote: t('league.divider.demote') }}
        alone={size <= 1}
      />
    </>
  );
}

/** Big "12." over "/ 30", this week's Wago and how far the next zone is. */
function YourRankCard({ rank, size, points, status }: { rank: number; size: number; points: number; status: string | null }) {
  const { t, language } = useI18n();
  return (
    <NeonCard tone="gold" grid style={styles.block} testID="your-rank">
      <Text style={styles.cardLabel}>{t('league.yourRankTitle')}</Text>
      <View style={styles.rankLine} accessible accessibilityLabel={t('league.rankA11y', { rank, size })}>
        <Text style={styles.rankBig}>{t('league.rankBig', { rank })}</Text>
        <Text style={styles.rankOf}>{t('league.rankOf', { size })}</Text>
      </View>
      <Text style={styles.thisWeek}>{t('league.thisWeek', { points: formatDecimal(points, 2, language) })}</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </NeonCard>
  );
}

/**
 * One green card with the standings: rank (a plain medal for the top 3), letter avatar, name and
 * this week's Wago. Long lists start short; "Tümünü gör" opens the rest. Zone boundaries are
 * labelled dividers inside the card, not just colour.
 */
function StandingsCard({
  rows,
  size,
  dividers,
  alone,
}: {
  rows: LeagueStanding[];
  size: number;
  dividers: { promote: string; demote: string };
  alone?: boolean;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const items = standingsList(rows, expanded);
  const shortened = rows.length > items.filter((i) => i.kind === 'row').length;

  return (
    <NeonCard grid style={styles.block} testID="standings">
      <View style={styles.standingsHead}>
        <Text style={styles.cardTitle}>{t('league.standings')}</Text>
        <Text style={styles.participants}>{t('league.participants', { count: size })}</Text>
      </View>
      {alone ? <Text style={styles.alone}>{t('league.alone')}</Text> : null}
      {items.map((item, i) => (
        <StandingItem key={itemKey(item, i)} item={item} dividers={dividers} />
      ))}
      {(shortened || expanded) && rows.length > 0 ? (
        <Pressable onPress={() => setExpanded(!expanded)} accessibilityRole="button" accessibilityState={{ expanded }} style={styles.seeAll} hitSlop={8}>
          <Text style={styles.seeAllText}>{expanded ? t('league.showLess') : t('league.showAll')}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.neon} />
        </Pressable>
      ) : null}
    </NeonCard>
  );
}

const itemKey = (item: ListItem<LeagueStanding>, i: number) =>
  item.kind === 'row' ? `r${item.row.rank}` : item.kind === 'divider' ? `d${item.zone}${i}` : `g${i}`;

const MEDAL_COLORS: Record<number, string> = { 1: theme.colors.medalGold, 2: theme.colors.medalSilver, 3: theme.colors.medalBronze };

function StandingItem({ item, dividers }: { item: ListItem<LeagueStanding>; dividers: { promote: string; demote: string } }) {
  const { t, language } = useI18n();
  if (item.kind === 'gap') {
    return (
      <Text style={styles.gap} accessibilityLabel={t('league.more')}>
        ⋯
      </Text>
    );
  }
  if (item.kind === 'divider') {
    const promote = item.zone === 'promote';
    return (
      <View style={styles.divider} accessibilityRole="text">
        <View style={[styles.dividerLine, { backgroundColor: promote ? theme.colors.neon : theme.colors.danger }]} />
        <Text style={[styles.dividerText, { color: promote ? theme.colors.neon : theme.colors.danger }]}>{promote ? dividers.promote : dividers.demote}</Text>
        <View style={[styles.dividerLine, { backgroundColor: promote ? theme.colors.neon : theme.colors.danger }]} />
      </View>
    );
  }
  const row = item.row;
  const medal = MEDAL_COLORS[row.rank];
  const name = row.isYou ? t('league.you') : row.name ?? '';
  const points = formatDecimal(row.points, 2, language);
  return (
    <View
      style={[styles.row, row.isYou && styles.rowYou]}
      accessible
      accessibilityLabel={t('league.rowA11y', { rank: row.rank, name, points })}
      testID={row.isYou ? 'standing-you' : undefined}>
      <View style={styles.rankCell}>
        {medal ? <Ionicons name="medal" size={20} color={medal} /> : <Text style={styles.rank}>{row.rank}</Text>}
      </View>
      <View style={[styles.avatar, row.isYou && styles.avatarYou, row.frame && FRAME_COLORS[row.frame] ? { borderWidth: 2, borderColor: FRAME_COLORS[row.frame] } : null]}>
        <Text style={[styles.avatarText, row.isYou && styles.avatarTextYou]}>{(row.name ?? '?').charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {row.isYou ? row.name : name}
      </Text>
      {row.isYou ? (
        <View style={styles.youTag}>
          <Text style={styles.youTagText}>{t('league.you')}</Text>
        </View>
      ) : null}
      <Text style={styles.points}>{points}</Text>
    </View>
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
    <NeonCard tone="gold" style={styles.block} testID="tournament-card">
      <Text style={styles.cardTitle}>💎 {t('tournament.title')}</Text>
      <Text style={styles.body}>{t('tournament.desc')}</Text>
      <Text style={styles.cardLabel}>{t('tournament.rewardsTitle')}</Text>
      {(rewards ?? []).map((r) => (
        <View key={r.rank} style={styles.rewardRow}>
          <Text style={styles.rewardPlace}>{placeKeys[r.rank - 1] ? t(placeKeys[r.rank - 1]) : r.rank}</Text>
          <Text style={styles.rewardValue}>{rewardText(t, r)}</Text>
        </View>
      ))}
      <Text style={styles.note}>{t('tournament.note')}</Text>
    </NeonCard>
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
  let good = false;
  if (result.outcome === 'advanced') {
    const next = NEXT_STAGE[result.stage];
    text = t('tournament.result.advanced', { stage, next: next ? t(STAGE_NAME_KEYS[next]) : stage });
    good = true;
  } else if (result.outcome === 'eliminated') {
    text = t('tournament.result.eliminated', { stage });
  } else if (result.reward) {
    const placeKey = (['tournament.place.1', 'tournament.place.2', 'tournament.place.3'] as const)[result.rank - 1];
    text = t('tournament.result.finalReward', { place: placeKey ? t(placeKey) : result.rank, reward: rewardText(t, result.reward) });
    good = true;
  } else {
    text = t('tournament.result.finalNone', { rank: result.rank });
  }
  return (
    <NeonCard tone={good ? 'gold' : 'green'} onPress={onDismiss} accessibilityLabel={t('league.result.dismiss')} style={styles.block}>
      <Text style={[styles.bannerText, result.outcome === 'eliminated' && styles.bannerDemote]}>{text}</Text>
      {card && result.reward && <ShareButton onPress={() => onShare(card, rewardText(t, result.reward!))} />}
    </NeonCard>
  );
}

function TournamentStageView({ view, msLeft }: { view: LiveTournamentLeagueView; msLeft: number }) {
  const { t } = useI18n();
  const tour = view.tournament;
  const endsIn = useEndsIn(msLeft, 'tournament');
  const you = tour.standings.find((s) => s.isYou);
  const status =
    tour.stage === 'final' || !you?.zone ? null : you.zone === 'promote' ? t('tournament.status.advancing') : t('tournament.status.out');

  return (
    <>
      <NeonCard tone="gold" grid style={styles.block} testID="stage-card">
        <View style={styles.leagueRow}>
          <View style={[styles.iconBox, styles.iconBoxGold]}>
            <Ionicons name="trophy" size={24} color={theme.colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.leagueName}>{t(STAGE_NAME_KEYS[tour.stage])}</Text>
            <Text style={styles.endsIn}>{endsIn}</Text>
          </View>
        </View>
        <Text style={styles.meta}>{t('tournament.stageOf', { n: tour.stageNumber, total: tour.stageCount })}</Text>
        <Text style={styles.meta}>
          {tour.stage === 'final' ? t('tournament.finalRule') : t('tournament.advanceRule', { count: tour.advanceCount, size: tour.size })}
        </Text>
      </NeonCard>
      <YourRankCard rank={tour.yourRank} size={tour.size} points={tour.yourPoints} status={status} />
      <StandingsCard
        rows={tour.standings}
        size={tour.size}
        dividers={{ promote: t('tournament.divider.advance'), demote: t('tournament.divider.eliminated') }}
      />
    </>
  );
}

// Glow only on titles and big numbers, always behind the text.
const glow = (color: string) => ({ textShadowColor: color, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } });

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgDeep },
  scroll: { paddingHorizontal: theme.spacing.lg + 2, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xxl + 16 },
  centerBlock: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, textAlign: 'center' },
  retry: { marginTop: theme.spacing.lg, alignSelf: 'center' },
  block: { marginBottom: theme.spacing.lg },
  flex: { flex: 1, minWidth: 0 },

  titleBlock: { marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl + 6, lineHeight: 34, ...glow(theme.colors.neonGlow) },
  subtitle: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm + 0.5, lineHeight: 19, marginTop: 6 },

  cardTitle: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg - 1 },
  cardLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.displayMedium,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: theme.spacing.sm,
  },
  body: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19, marginTop: theme.spacing.sm },
  meta: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, lineHeight: 17, marginTop: 4 },
  note: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, lineHeight: 17, marginTop: theme.spacing.md },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: theme.colors.neon,
    backgroundColor: theme.colors.neonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxGold: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  leagueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  leagueName: { color: theme.colors.accent, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg + 2, ...glow(theme.colors.goldGlow) },
  endsIn: { color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm + 0.5, marginTop: 2 },

  rankLine: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, marginTop: 2 },
  rankBig: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.hero, lineHeight: theme.fontSizes.hero + 10, ...glow(theme.colors.goldGlow) },
  rankOf: { color: theme.colors.tabInactive, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.lg },
  thisWeek: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md },
  status: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginTop: 4 },

  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  bar: { marginTop: theme.spacing.md },
  progressText: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.sm },

  standingsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  participants: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm },
  alone: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, lineHeight: 19, marginBottom: theme.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm + 2,
    borderWidth: 1,
    borderColor: 'transparent',
    marginTop: 2,
  },
  // The user's row: a soft green fill with a glowing green edge.
  rowYou: {
    backgroundColor: theme.colors.neonSoft,
    borderColor: theme.colors.neon,
    shadowColor: theme.colors.neon,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  rankCell: { width: 26, alignItems: 'center' },
  rank: { color: theme.colors.tabInactive, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.ringTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarYou: { backgroundColor: theme.colors.neon },
  avatarText: { color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm },
  avatarTextYou: { color: theme.colors.neonInk },
  name: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md - 1 },
  youTag: { backgroundColor: theme.colors.neon, borderRadius: theme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  youTagText: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xs },
  points: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm, fontVariant: ['tabular-nums'] },
  gap: { color: theme.colors.tabInactive, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg, textAlign: 'center', paddingVertical: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.sm },
  dividerLine: { flex: 1, height: 1, opacity: 0.6 },
  dividerText: { fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.xs, letterSpacing: 0.4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: theme.spacing.md, paddingVertical: 4 },
  seeAllText: { color: theme.colors.neon, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm },

  howRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  howNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.neonSoft,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howNumText: { color: theme.colors.neon, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.xs },
  howText: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19 },

  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: 5 },
  rewardPlace: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },
  rewardValue: { flex: 1, textAlign: 'right', color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.xs + 0.5 },

  bannerText: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, lineHeight: 19 },
  bannerDemote: { color: theme.colors.danger },
  bannerShare: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
  },
  bannerShareText: { color: theme.colors.accentInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.sm },
});
