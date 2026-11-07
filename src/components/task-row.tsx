import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { formatDecimal } from '@/lib/mining-math';
import { DailyTask, taskState } from '@/services/tasks-api';
import { theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** `lock`: what opens the task (on its locked button); `lockInfo`: the longer note shown on tap. */
const TASK_META: Record<string, { icon: IconName; title: TranslationKey; hint: TranslationKey; lock: TranslationKey; lockInfo: TranslationKey }> = {
  mine: { icon: 'flash-outline', title: 'tasks.mine.title', hint: 'tasks.mine.hint', lock: 'tasks.lock.mine', lockInfo: 'tasks.lockInfo.mine' },
  friend: { icon: 'people-outline', title: 'tasks.friend.title', hint: 'tasks.friend.hint', lock: 'tasks.lock.friend', lockInfo: 'tasks.lockInfo.friend' },
  steps: { icon: 'walk-outline', title: 'tasks.steps.title', hint: 'tasks.steps.hint', lock: 'tasks.lock.steps', lockInfo: 'tasks.lockInfo.steps' },
};

/** One daily task: what it is, its reward and progress, and claim / done / what opens it. */
export function TaskRow({ task, busy, onClaim }: { task: DailyTask; busy: boolean; onClaim: () => void }) {
  const { t, language } = useI18n();
  const meta = TASK_META[task.id];
  if (!meta) return null;
  const state = taskState(task);
  const target = task.target.toLocaleString(language);

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
        <Text style={styles.taskTitle}>{t(meta.title, { target: task.target.toLocaleString(language) })}</Text>
        <Text style={styles.taskHint}>{t(meta.hint)}</Text>
        <Text style={styles.taskReward}>
          +{formatDecimal(task.reward, 2, language)} {t('unit.clb')}
          {task.target > 1 && !task.claimed ? `  ·  ${task.progress.toLocaleString(language)} / ${task.target.toLocaleString(language)}` : ''}
        </Text>
        {task.target > 1 && !task.claimed ? <ProgressBar progress={task.progress / task.target} style={styles.taskBar} /> : null}
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
      ) : state === 'claimed' ? (
        <View style={[styles.action, styles.actionClaimed]}>
          <Text style={styles.actionClaimedText}>{t('tasks.done')}</Text>
        </View>
      ) : (
        // Locked: says what opens it; a tap explains a little more.
        <Pressable
          onPress={() => Alert.alert(t(meta.title, { target }), t(meta.lockInfo, { target }))}
          accessibilityRole="button"
          accessibilityHint={t(meta.lockInfo, { target })}
          style={({ pressed }) => [styles.action, styles.actionLocked, pressed && { opacity: 0.7 }]}>
          <Ionicons name="lock-closed" size={13} color={theme.colors.textMuted} />
          <Text style={styles.actionLockedText}>{t(meta.lock, { target })}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  taskBar: { marginTop: theme.spacing.sm },
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
  actionLocked: { backgroundColor: theme.colors.ringTrack, maxWidth: 124, paddingVertical: 6, gap: 2 },
  actionLockedText: { color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.xs, textAlign: 'center' },
  actionClaimed: { backgroundColor: theme.colors.positiveSoft },
  actionClaimedText: { color: theme.colors.positive, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },
});
