import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsibleCard } from '@/components/collapsible-card';
import { ScreenHeader } from '@/components/screen-header';
import { StepsCard } from '@/components/steps-card';
import { TaskRow } from '@/components/task-row';
import { BACKGROUND_IMAGES } from '@/components/home/backgrounds';
import { NeonCard } from '@/components/neon-card';
import { ScreenBackground } from '@/components/home/screen-background';
import { Button, EmptyState } from '@/components/ui';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useNow } from '@/hooks/use-now';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { formatDecimal, formatDuration, streakDayIsLocal } from '@/lib/mining-math';
import { ApiError } from '@/services/api';
import {
  claimTask,
  DailyTask,
  getTasks,
  msUntilReset,
  TaskErrorCode,
  TaskProgress,
} from '@/services/tasks-api';
import { theme } from '@/theme';

// If this screen throws while drawing, the tab shows a retry screen instead of the app closing.
export { ScreenError as ErrorBoundary } from '@/components/screen-error';

const CLAIM_ERRORS: Record<TaskErrorCode, TranslationKey> = {
  unknown_task: 'common.unknownError',
  not_complete: 'tasks.err.notComplete',
  already_claimed: 'tasks.err.alreadyClaimed',
};

export default function TasksScreen() {
  const { t, language } = useI18n();
  const { auth } = useSession();
  const { status: miningStatus, refresh: refreshMining } = useMining();
  const token = auth?.token ?? null;

  const [progress, setProgress] = useState<TaskProgress | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const now = useNow(1000);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setProgress(await getTasks(token));
      setFetchedAt(Date.now());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // The day rolled over (00:00 UTC) while the screen was open: tasks are new.
  const resetIn = progress ? msUntilReset(progress, now - fetchedAt) : 0;
  const rolledOver = !!progress && resetIn === 0;
  useEffect(() => {
    if (rolledOver) load();
  }, [rolledOver, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onClaim(task: DailyTask) {
    if (!token) return;
    setClaiming(task.id);
    setMessage(null);
    try {
      const res = await claimTask(token, task.id);
      setMessage({ text: t('tasks.claimed', { reward: formatDecimal(res.reward, 2, language) }), ok: true });
    } catch (e) {
      const key = e instanceof ApiError && e.code ? CLAIM_ERRORS[e.code as TaskErrorCode] : undefined;
      setMessage({ text: key ? t(key) : t('common.unknownError'), ok: false });
    } finally {
      setClaiming(null);
      await Promise.all([load(), refreshMining()]);
    }
  }

  const allClaimed = !!progress && progress.tasks.length > 0 && progress.tasks.every((x) => x.claimed);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed behind the list: the tab's picture when there is one, else the drawn topographic lines. */}
      <ScreenBackground variant="neon" image={BACKGROUND_IMAGES.tasks} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />}>
        <ScreenHeader />
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.title} accessibilityRole="header">
              {t('tasks.title')}
            </Text>
            <Text style={styles.subtitle}>{t(streakDayIsLocal(miningStatus) ? 'tasks.resetNoteLocal' : 'tasks.resetNote')}</Text>
          </View>
          {progress ? (
            <View style={styles.resetBox} accessible accessibilityLabel={t('tasks.resetsIn', { time: formatDuration(resetIn) })}>
              <Ionicons name="time-outline" size={24} color={theme.colors.accent} />
              <View>
                <Text style={styles.resetLabel}>{t('tasks.resetsInLabel')}</Text>
                <Text style={styles.resetTime}>{formatDuration(resetIn)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {!progress ? (
          loadError ? (
            <View style={styles.centerBlock}>
              <Text style={styles.error}>{t('tasks.loadFailed')}</Text>
              <Button label={t('common.retry')} onPress={load} variant="ghost" style={styles.retry} />
            </View>
          ) : (
            <ActivityIndicator color={theme.colors.text} style={styles.centerBlock} />
          )
        ) : (
          <>
            <NeonCard tone="gold" style={styles.summary} testID="earned-today">
              <View>
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryLabel}>{t('tasks.earnedToday')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryValue}>{formatDecimal(progress.earnedToday, 2, language)}</Text>
                  <Text style={styles.summaryUnit}>{t('unit.clb')}</Text>
                </View>
              </View>
              {allClaimed ? <Ionicons name="checkmark-circle" size={26} color={theme.colors.neon} /> : null}
            </NeonCard>

            <StepsCard />


            {message && (
              <Text style={[styles.message, { color: message.ok ? theme.colors.neon : theme.colors.danger }]}>
                {message.text}
              </Text>
            )}

            {progress.tasks.length === 0 && <EmptyState icon="sparkles-outline" title={t('tasks.emptyTitle')} body={t('tasks.emptyBody')} />}

            {progress.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={claiming === task.id}
                onClaim={() => onClaim(task)}
              />
            ))}

            {/* Below the tasks, as in the design. */}
            <CollapsibleCard neon id="tasks" title={t('tasks.how.title')} style={styles.how}>
              {(['tasks.how.step1', 'tasks.how.step2', 'tasks.how.step3'] as const).map((key, i) => (
                <View key={key} style={styles.howRow}>
                  <View style={styles.howNum}>
                    <Text style={styles.howNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.howText}>{t(key)}</Text>
                </View>
              ))}
            </CollapsibleCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
  titleText: { flex: 1 },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl + 6, lineHeight: 34, ...glow(theme.colors.neonGlow) },
  subtitle: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm + 0.5, lineHeight: 19, marginTop: 6 },
  resetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.ringTrack,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.glass,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resetLabel: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs },
  resetTime: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md, fontVariant: ['tabular-nums'] },

  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 112,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  summaryChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  summaryLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.displayMedium,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm },
  summaryValue: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.hero, lineHeight: theme.fontSizes.hero + 10, fontVariant: ['tabular-nums'], ...glow(theme.colors.goldGlow) },
  summaryUnit: { color: theme.colors.accent, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl, ...glow(theme.colors.goldGlow) },
  how: { marginBottom: theme.spacing.lg, paddingVertical: theme.spacing.lg + 2 },
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
  message: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, marginBottom: theme.spacing.md },
});
