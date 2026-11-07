import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsibleCard } from '@/components/collapsible-card';
import { ScreenHeader } from '@/components/screen-header';
import { StepsCard } from '@/components/steps-card';
import { TaskRow } from '@/components/task-row';
import { Button, Card, EmptyState, ScreenTitle } from '@/components/ui';
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
                <Text style={styles.summaryValue}>{formatDecimal(progress.earnedToday, 2, language)} {t('unit.clb')}</Text>
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

            <CollapsibleCard id="tasks" title={t('tasks.how.title')} style={styles.how}>
              {(['tasks.how.step1', 'tasks.how.step2', 'tasks.how.step3'] as const).map((key, i) => (
                <View key={key} style={styles.howRow}>
                  <View style={styles.howNum}>
                    <Text style={styles.howNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.howText}>{t(key)}</Text>
                </View>
              ))}
            </CollapsibleCard>

            {message && (
              <Text style={[styles.message, { color: message.ok ? theme.colors.positive : theme.colors.danger }]}>
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  how: { marginBottom: theme.spacing.md },
  howRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  howNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howNumText: { color: theme.colors.accent, fontFamily: theme.fonts.monoMedium, fontSize: theme.fontSizes.xs },
  howText: { flex: 1, color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, lineHeight: 19 },
  message: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, marginBottom: theme.spacing.md },

});
