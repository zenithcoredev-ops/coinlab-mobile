import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useSession } from '@/context/session';
import { useSteps } from '@/context/steps';
import { useI18n } from '@/i18n';
import { leagueCardInfo, tasksSummary } from '@/lib/home-visuals';
import { LEAGUE_NAME_KEYS } from '@/lib/league';
import { leagueWeekEndShort } from '@/lib/league-week';
import { formatClbPerHour, formatDecimal } from '@/lib/mining-math';
import { DIAMOND_LEAGUE } from '@/services/league-api';
import { useLeagueSnapshot } from '@/services/league-cache';
import { DailyTask, getTasks } from '@/services/tasks-api';
import { STEP_GOAL } from '@/widget/steps';
import { theme } from '@/theme';
import { NeonBar } from './neon-bar';
import { NeonCard } from '@/components/neon-card';

/**
 * "Bugün toplanan +1,84 Wago": the Wago collected on the local day, one line inside the balance card.
 * Left out when the server doesn't send the figure (null).
 */
export function TodayLine({ collectedToday }: { collectedToday: number | null | undefined }) {
  const { t, language } = useI18n();
  if (typeof collectedToday !== 'number') return null;
  return (
    <View style={styles.today} testID="today-line">
      <Ionicons name="leaf" size={14} color={theme.colors.accent} />
      <Text style={styles.todayLabel}>{t('home.today')}</Text>
      <Text style={styles.todayValue}>
        +{formatDecimal(collectedToday, 2, language)} {t('unit.clb')}
      </Text>
    </View>
  );
}

/** Today's steps (Health Connect) in a small gold ring, and what the session's steps add. */
export function StepsMiniCard() {
  const { t, language } = useI18n();
  const router = useRouter();
  const { availability, steps, todaySteps, bonusClbPerHour } = useSteps();
  const ready = availability === 'ready';
  const progress = todaySteps !== null ? Math.min(1, todaySteps / STEP_GOAL) : 0;
  const size = MINI_ICON;
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;

  const value = ready && todaySteps !== null ? t('home.steps.value', { steps: todaySteps.toLocaleString(language) }) : t('home.steps.connect');
  const sub = !ready
    ? null
    : steps > 0 || bonusClbPerHour > 0
      ? t('home.steps.bonus', { rate: formatClbPerHour(bonusClbPerHour, language), unit: t('unit.rate') })
      : t('home.steps.today');

  return (
    <NeonCard tone="gold" grid style={styles.mini} onPress={() => router.navigate('/(tabs)/tasks')} accessibilityLabel={t('steps.title')}>
      <View style={styles.miniIcon}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.accent} strokeOpacity={0.18} strokeWidth={3} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.colors.accent}
            strokeWidth={3}
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - progress)}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Ionicons name="footsteps" size={14} color={theme.colors.accent} style={styles.miniIconGlyph} />
      </View>
      <Text style={styles.miniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={MIN_SCALE}>
        {value}
      </Text>
      {sub ? (
        <Text style={styles.miniSub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={MIN_SCALE}>
          {sub}
        </Text>
      ) : null}
    </NeonCard>
  );
}

/** The user's league and rank and how far promotion is; or how much is left to join. */
export function LeagueMiniCard({ balance }: { balance: number }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const snapshot = useLeagueSnapshot();
  const info = leagueCardInfo(snapshot, balance, DIAMOND_LEAGUE);
  const when = leagueWeekEndShort(t, language, new Date(), snapshot?.weekEnd ? new Date(snapshot.weekEnd) : null);

  let title = t('home.league.title');
  let main: string | null = null;
  let sub = t('home.league.unknown');
  if (info.kind === 'locked') {
    sub = t('home.league.locked', { amount: formatDecimal(info.missing, 2, language) });
  } else if (info.kind === 'tournament') {
    title = t('home.league.tournament');
    sub = when;
  } else if (info.kind === 'active') {
    title = t(LEAGUE_NAME_KEYS[info.league]);
    main = info.rank !== null ? t('home.league.rank', { rank: info.rank }) : null;
    sub =
      info.toPromotion === null
        ? when
        : info.toPromotion === 0
          ? t(info.isDiamond ? 'home.league.inTournamentZone' : 'home.league.inZone')
          : t(info.isDiamond ? 'home.league.toTournament' : 'home.league.toPromote', { count: info.toPromotion });
  }

  return (
    <NeonCard tone="gold" grid style={styles.mini} onPress={() => router.navigate('/(tabs)/league')} accessibilityLabel={`${title}, ${sub}`}>
      <View style={styles.leagueHead}>
        <Ionicons name="trophy" size={18} color={theme.colors.accent} />
        <Text style={styles.leagueName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={MIN_SCALE}>
          {title}
        </Text>
      </View>
      {main ? <Text style={styles.leagueRank}>{main}</Text> : null}
      <Text style={styles.miniSub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={MIN_SCALE}>
        {sub}
      </Text>
    </NeonCard>
  );
}

/** One line: "Günlük görevler 1/3", a short bar and a chevron. Opens the Tasks tab. */
export function DailyTasksCard() {
  const { t } = useI18n();
  const router = useRouter();
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const [tasks, setTasks] = useState<DailyTask[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let cancelled = false;
      getTasks(token)
        .then((p) => !cancelled && setTasks(p.tasks))
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [token])
  );

  if (!tasks || tasks.length === 0) return null;
  const summary = tasksSummary(tasks);
  const title = t('home.tasks.title', { done: summary.done, total: summary.total });

  return (
    <NeonCard style={styles.strip} onPress={() => router.navigate('/(tabs)/tasks')} accessibilityLabel={title} testID="tasks-strip">
      <View style={styles.stripRow}>
        <Ionicons name="checkbox-outline" size={18} color={theme.colors.neon} />
        <Text style={styles.stripTitle} numberOfLines={1}>
          {title}
        </Text>
        <NeonBar progress={summary.progress} height={8} style={styles.stripBar} />
        <Ionicons name="chevron-forward" size={18} color={theme.colors.tabInactive} />
      </View>
    </NeonCard>
  );
}

/** Small text on these cards may shrink to fit one line, never below 12sp. */
const MIN_SCALE = 12 / theme.fontSizes.sm;
const MINI_ICON = 34;

const styles = StyleSheet.create({
  today: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayLabel: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm },
  todayValue: { color: theme.colors.accent, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.sm + 1 },

  mini: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md },
  miniIcon: { width: MINI_ICON, height: MINI_ICON, alignItems: 'center', justifyContent: 'center' },
  miniIconGlyph: { position: 'absolute' },
  miniValue: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md, textAlign: 'center' },
  miniSub: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, textAlign: 'center' },
  leagueHead: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  leagueName: { flexShrink: 1, color: theme.colors.accent, fontFamily: theme.fonts.rounded, fontSize: theme.fontSizes.sm },
  leagueRank: {
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
    fontSize: theme.fontSizes.lg,
    textShadowColor: theme.colors.goldGlow,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },

  strip: { marginTop: theme.spacing.sm, paddingVertical: theme.spacing.md },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  stripTitle: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },
  stripBar: { width: 56 },
});
