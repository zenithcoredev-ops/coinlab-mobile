import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { NeonBar } from '@/components/home/neon-bar';
import { NeonCard } from '@/components/neon-card';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { formatDecimal } from '@/lib/mining-math';
import { DailyTask, taskState } from '@/services/tasks-api';
import { theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** `lock`: what opens the task (on its locked button); `lockInfo`: the longer note shown on tap. */
export const TASK_META: Record<string, { icon: IconName; title: TranslationKey; hint: TranslationKey; lock: TranslationKey; lockInfo: TranslationKey }> = {
  mine: { icon: 'flash-outline', title: 'tasks.mine.title', hint: 'tasks.mine.hint', lock: 'tasks.lock.mine', lockInfo: 'tasks.lockInfo.mine' },
  friend: { icon: 'people-outline', title: 'tasks.friend.title', hint: 'tasks.friend.hint', lock: 'tasks.lock.friend', lockInfo: 'tasks.lockInfo.friend' },
  steps: { icon: 'walk-outline', title: 'tasks.steps.title', hint: 'tasks.steps.hint', lock: 'tasks.lock.steps', lockInfo: 'tasks.lockInfo.steps' },
};

/**
 * One daily task as a neon card: an icon box, the title, what to do and its gold reward; on the right
 * "Al" (ready), a quiet "Alındı ✓" (done; not a button) or a lock with what opens it.
 */
export function TaskRow({ task, busy, onClaim }: { task: DailyTask; busy: boolean; onClaim: () => void }) {
  const { t, language } = useI18n();
  const meta = TASK_META[task.id];
  if (!meta) return null;
  const state = taskState(task);
  const target = task.target.toLocaleString(language);
  const showProgress = task.target > 1 && !task.claimed;

  return (
    <NeonCard grid style={styles.card} testID={`task-${task.id}`}>
      <View style={styles.row}>
        {/* Filled green once it can be or has been claimed; a quiet grey box while locked. */}
        <View style={[styles.icon, state === 'locked' ? styles.iconLocked : styles.iconOpen]}>
          <Ionicons name={meta.icon} size={22} color={state === 'locked' ? theme.colors.tabInactive : theme.colors.neonInk} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{t(meta.title, { target })}</Text>
          <Text style={styles.hint}>{t(meta.hint)}</Text>
          <Text style={styles.reward}>
            +{formatDecimal(task.reward, 2, language)} {t('unit.clb')}
            {showProgress ? <Text style={styles.count}>{`  ·  ${task.progress.toLocaleString(language)} / ${target}`}</Text> : null}
          </Text>
        </View>
        {state === 'ready' ? (
          <Pressable
            onPress={onClaim}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, styles.actionReady, (busy || pressed) && { opacity: 0.75 }]}>
            {busy ? <ActivityIndicator color={theme.colors.neonInk} /> : <Text style={styles.actionReadyText}>{t('tasks.claim')}</Text>}
          </Pressable>
        ) : state === 'claimed' ? (
          // Done: a quiet label, not a button.
          <View style={[styles.action, styles.actionClaimed]} accessibilityRole="text">
            <Text style={styles.actionClaimedText}>{t('tasks.done')}</Text>
          </View>
        ) : (
          // Locked: says what opens it; a tap explains a little more.
          <Pressable
            onPress={() => Alert.alert(t(meta.title, { target }), t(meta.lockInfo, { target }))}
            accessibilityRole="button"
            accessibilityHint={t(meta.lockInfo, { target })}
            style={({ pressed }) => [styles.action, styles.actionLocked, pressed && { opacity: 0.7 }]}>
            <Ionicons name="lock-closed" size={13} color={theme.colors.tabInactive} />
            <Text style={styles.actionLockedText}>{t(meta.lock, { target })}</Text>
          </Pressable>
        )}
      </View>
      {showProgress ? <NeonBar progress={task.progress / task.target} height={8} style={styles.bar} /> : null}
    </NeonCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.lg, paddingVertical: theme.spacing.lg + 2, paddingHorizontal: theme.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  iconOpen: { backgroundColor: theme.colors.neon },
  iconLocked: { backgroundColor: theme.colors.ringTrack },
  info: { flex: 1, minWidth: 0 },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md + 2 },
  hint: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 4, lineHeight: 16 },
  reward: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.sm, marginTop: 8 },
  count: { color: theme.colors.accent, fontFamily: theme.fonts.displayMedium },
  bar: { marginTop: theme.spacing.md },
  action: {
    minWidth: 92,
    minHeight: 40,
    borderRadius: theme.radius.sm + 2,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionReady: {
    backgroundColor: theme.colors.neon,
    shadowColor: theme.colors.neon,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  actionReadyText: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md + 1 },
  // Done: soft green, flat, no glow - it isn't something to press.
  actionClaimed: { backgroundColor: theme.colors.neonSoft },
  actionClaimedText: { color: theme.colors.neon, fontFamily: theme.fonts.rounded, fontSize: theme.fontSizes.sm },
  actionLocked: {
    flexDirection: 'row',
    maxWidth: 136,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.ringTrack,
  },
  actionLockedText: { flexShrink: 1, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5 },
});
