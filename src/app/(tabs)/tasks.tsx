import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { StepsCard } from '@/components/steps-card';
import { Button, Card, ScreenTitle } from '@/components/ui';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useNow } from '@/hooks/use-now';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { formatDuration, streakDayIsLocal } from '@/lib/mining-math';
import { ApiError } from '@/services/api';
import {
  claimTask,
  DailyTask,
  getTasks,
  msUntilReset,
  TaskErrorCode,
  TaskProgress,
  taskState,
} from '@/services/tasks-api';
import { theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TASK_META: Record<string, { icon: IconName; title: TranslationKey; hint: TranslationKey }> = {
  mine: { icon: 'hammer-outline', title: 'tasks.mine.title', hint: 'tasks.mine.hint' },
  friend: { icon: 'people-outline', title: 'tasks.friend.title', hint: 'tasks.friend.hint' },
  steps: { icon: 'walk-outline', title: 'tasks.steps.title', hint: 'tasks.steps.hint' },
};

const CLAIM_ERRORS: Record<TaskErrorCode, TranslationKey> = {
  unknown_task: 'common.unknownError',
  not_complete: 'tasks.err.notComplete',
  already_claimed: 'tasks.err.alreadyClaimed',
};

export default function TasksScreen() {
  const { t } = useI18n();
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
      setMessage({ text: t('tasks.claimed', { reward: res.reward.toFixed(2) }), ok: true });
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />}>
        <ScreenHeader />
        <ScreenTitle title={t('tasks.title')} subtitle={t(streakDayIsLocal(miningStatus) ? 'tasks.subtitleLocal' : 'tasks.subtitle')} />

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
            <Card style={styles.summary}>
              <View>
                <Text style={styles.summaryLabel}>{t('tasks.earnedToday')}</Text>
                <Text style={styles.summaryValue}>{progress.earnedToday.toFixed(2)} {t('unit.clb')}</Text>
              </View>
              <View style={styles.summaryRight}>
                <Ionicons
                  name={allClaimed ? 'checkmark-circle' : 'time-outline'}
                  size={24}
                  color={allClaimed ? theme.colors.positive : theme.colors.textMuted}
                />
                <Text style={styles.resetText}>{t('tasks.resetsIn', { time: formatDuration(resetIn) })}</Text>
              </View>
            </Card>

            <StepsCard />

            {message && (
              <Text style={[styles.message, { color: message.ok ? theme.colors.positive : theme.colors.danger }]}>
                {message.text}
              </Text>
            )}

            {progress.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={claiming === task.id}
                onClaim={() => onClaim(task)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskRow({ task, busy, onClaim }: { task: DailyTask; busy: boolean; onClaim: () => void }) {
  const { t } = useI18n();
  const meta = TASK_META[task.id];
  if (!meta) return null;
  const state = taskState(task);

  return (
    <View style={[styles.task, state === 'ready' && styles.taskReady, state === 'claimed' && styles.taskClaimed]}>
      <View style={[styles.taskIcon, state === 'ready' && styles.taskIconReady, state === 'claimed' && styles.taskIconClaimed]}>
        <Ionicons
          name={meta.icon}
          size={20}
          color={state === 'claimed' ? theme.colors.positive : state === 'ready' ? theme.colors.accent : theme.colors.textMuted}
        />
      </View>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{t(meta.title, { target: task.target.toLocaleString() })}</Text>
        <Text style={styles.taskHint}>{t(meta.hint)}</Text>
        <Text style={styles.taskReward}>
          +{task.reward.toFixed(2)} {t('unit.clb')}
          {task.target > 1 && !task.claimed ? `  ·  ${task.progress.toLocaleString()} / ${task.target.toLocaleString()}` : ''}
        </Text>
      </View>
      {state === 'ready' ? (
        <Pressable
          onPress={onClaim}
          disabled={busy}
          accessibilityRole="button"
          style={[styles.action, styles.actionReady, busy && { opacity: 0.6 }]}>
          {busy ? (
            <ActivityIndicator color={theme.colors.accentInk} />
          ) : (
            <Text style={styles.actionReadyText}>{t('tasks.claim')}</Text>
          )}
        </Pressable>
      ) : (
        <View style={[styles.action, state === 'claimed' ? styles.actionClaimed : styles.actionLocked]}>
          <Text style={state === 'claimed' ? styles.actionClaimedText : styles.actionLockedText}>
            {state === 'claimed' ? t('tasks.done') : t('tasks.locked')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl + 16 },
  centerBlock: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, textAlign: 'center' },
  retry: { marginTop: theme.spacing.lg, alignSelf: 'center' },

  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  summaryValue: { color: theme.colors.accent, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.xl },
  summaryRight: { alignItems: 'flex-end', gap: 4 },
  resetText: { color: theme.colors.textMuted, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs },
  message: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, marginBottom: theme.spacing.md },

  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md + 2,
    padding: theme.spacing.md + 2,
    marginBottom: theme.spacing.sm + 2,
  },
  taskReady: { borderColor: theme.colors.accentBorder },
  taskClaimed: { opacity: 0.75 },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.ringTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconReady: { backgroundColor: theme.colors.accentSoft },
  taskIconClaimed: { backgroundColor: theme.colors.positiveSoft },
  taskInfo: { flex: 1, minWidth: 0 },
  taskTitle: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 1 },
  taskHint: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 2 },
  taskReward: { color: theme.colors.accent, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs + 0.5, marginTop: 3 },
  action: {
    minWidth: 84,
    minHeight: 36,
    borderRadius: theme.radius.sm + 2,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionReady: { backgroundColor: theme.colors.accent },
  actionReadyText: { color: theme.colors.accentInk, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.sm },
  actionLocked: { backgroundColor: theme.colors.ringTrack },
  actionLockedText: { color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },
  actionClaimed: { backgroundColor: theme.colors.positiveSoft },
  actionClaimedText: { color: theme.colors.positive, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },
});
