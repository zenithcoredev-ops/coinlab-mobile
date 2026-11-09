import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { TASK_META } from '@/components/task-row';
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

/** "+1,84 Wago" collected on the local day. Left out when the server doesn't send the figure (null). */
export function TodayStrip({ collectedToday }: { collectedToday: number | null | undefined }) {
  const { t, language } = useI18n();
  if (typeof collectedToday !== 'number') return null;
  return (
    <NeonCard tone="gold" style={styles.strip} testID="today-strip">
      <View style={styles.stripRow}>
        <Ionicons name="leaf" size={20} color={theme.colors.accent} />
        <Text style={styles.stripLabel}>{t('home.today')}</Text>
        <Text style={styles.stripValue}>
          +{formatDecimal(collectedToday, 2, language)} {t('unit.clb')}
        </Text>
      </View>
    </NeonCard>
  );
}

/** Gold ring of today's steps (Health Connect), and the session's steps with their bonus. */
export function StepsMiniCard() {
  const { t, language } = useI18n();
  const router = useRouter();
  const { availability, steps, todaySteps, bonusClbPerHour } = useSteps();
  const ready = availability === 'ready';
  const progress = todaySteps !== null ? Math.min(1, todaySteps / STEP_GOAL) : 0;
  const size = 52;
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;

  return (
    <NeonCard tone="gold" grid style={styles.mini} onPress={() => router.navigate('/(tabs)/tasks')} accessibilityLabel={t('steps.title')}>
      <View style={styles.miniIcon}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.accent} strokeOpacity={0.18} strokeWidth={4} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.colors.accent}
            strokeWidth={4}
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - progress)}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Ionicons name="footsteps" size={18} color={theme.colors.accent} style={styles.miniIconGlyph} />
      </View>
      <Text style={styles.miniMain}>
        {ready && todaySteps !== null ? t('home.steps.today', { steps: todaySteps.toLocaleString(language) }) : t('home.steps.connect')}
      </Text>
      {ready ? (
        <Text style={styles.miniSub}>
          {steps > 0 || bonusClbPerHour > 0
            ? t('home.steps.session', { steps: steps.toLocaleString(language), rate: formatClbPerHour(bonusClbPerHour, language), unit: t('unit.rate') })
            : t('home.steps.noSession')}
        </Text>
      ) : null}
    </NeonCard>
  );
}

/** The user's league, rank and how far promotion is; or how much is left to join. */
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
          ? t(info.isDiamond ? 'home.league.inTournamentZone' : 'home.league.inZone', { when })
          : t(info.isDiamond ? 'home.league.toTournament' : 'home.league.toPromote', { count: info.toPromotion, when });
  }

  return (
    <NeonCard tone="gold" grid style={styles.mini} onPress={() => router.navigate('/(tabs)/league')} accessibilityLabel={title}>
      <Ionicons name="trophy" size={26} color={theme.colors.accent} />
      <Text style={styles.leagueName}>{title}</Text>
      {main ? <Text style={styles.leagueRank}>{main}</Text> : null}
      <Text style={styles.miniSub}>{sub}</Text>
    </NeonCard>
  );
}

/** Today's tasks: how many are done, a progress bar and the next one. Opens the Tasks tab. */
export function DailyTasksCard() {
  const { t, language } = useI18n();
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
  const next = summary.next;
  const meta = next ? TASK_META[next.id] : undefined;

  return (
    <NeonCard style={styles.tasks} onPress={() => router.navigate('/(tabs)/tasks')} accessibilityLabel={t('home.tasks.title', { done: summary.done, total: summary.total })}>
      <Text style={styles.tasksTitle}>{t('home.tasks.title', { done: summary.done, total: summary.total })}</Text>
      <NeonBar progress={summary.progress} style={styles.tasksBar} />
      <Text style={styles.tasksNext}>
        {next && meta
          ? t('home.tasks.next', {
              task: t(meta.title, { target: next.target.toLocaleString(language) }),
              reward: formatDecimal(next.reward, 2, language),
            })
          : t('home.tasks.allDone')}
      </Text>
    </NeonCard>
  );
}

const styles = StyleSheet.create({
  strip: { paddingVertical: theme.spacing.md + 2, marginBottom: theme.spacing.md },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  stripLabel: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md },
  stripValue: { color: theme.colors.accent, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md + 1 },

  mini: { flex: 1, alignItems: 'center', gap: 6, minHeight: 150, justifyContent: 'center' },
  miniIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  miniIconGlyph: { position: 'absolute' },
  miniMain: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md, textAlign: 'center' },
  miniSub: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, textAlign: 'center', lineHeight: 16 },
  leagueName: { color: theme.colors.accent, fontFamily: theme.fonts.rounded, fontSize: theme.fontSizes.sm },
  leagueRank: {
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
    fontSize: theme.fontSizes.xl + 2,
    textShadowColor: theme.colors.goldGlow,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },

  tasks: { marginTop: theme.spacing.md },
  tasksTitle: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg - 1 },
  tasksBar: { marginTop: theme.spacing.md },
  tasksNext: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, marginTop: theme.spacing.md },
});
