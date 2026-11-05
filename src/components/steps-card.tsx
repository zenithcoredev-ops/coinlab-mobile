import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { useSteps } from '@/context/steps';
import { useMining } from '@/context/mining';
import { useI18n } from '@/i18n';
import { stepsProgress } from '@/lib/health-steps';
import { formatClbPerHour } from '@/lib/mining-math';
import { STEP_BONUS_CAP_STEPS, STEPS_PER_BONUS_UNIT } from '@/services/steps-api';
import { theme } from '@/theme';

// Bonus per STEPS_PER_BONUS_UNIT comes from the server's breakdown, not a client constant.
export function StepsCard() {
  const { t, language } = useI18n();
  const { availability, steps, todaySteps, bonusClbPerHour, syncFailed, backgroundAccess, allowBackground, connect, openStore } = useSteps();
  const { status } = useMining();

  if (availability === 'unsupported') return null;

  const params = { app: t('app.name'), clb: t('unit.clb'), unit: t('unit.rate') };

  if (availability === 'not_installed' || availability === 'update_required') {
    const update = availability === 'update_required';
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>{t('steps.title')}</Text>
        <Text style={styles.body}>{t(update ? 'steps.update.body' : 'steps.install.body', params)}</Text>
        <Button label={t(update ? 'steps.update.button' : 'steps.install.button')} onPress={openStore} style={styles.button} />
      </Card>
    );
  }

  if (availability === 'needs_permission') {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>{t('steps.title')}</Text>
        <Text style={styles.body}>{t('steps.connect.body', params)}</Text>
        <Button label={t('steps.connect.button')} onPress={connect} style={styles.button} />
      </Card>
    );
  }

  const session = status?.session;
  const bonus = bonusClbPerHour;
  const capReached = steps >= STEP_BONUS_CAP_STEPS;
  const toNext = STEPS_PER_BONUS_UNIT - (steps % STEPS_PER_BONUS_UNIT);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>
        {t('steps.sessionProgress', { steps: steps.toLocaleString(language), cap: STEP_BONUS_CAP_STEPS.toLocaleString(language) })}
      </Text>
      {todaySteps !== null && <Text style={styles.today}>{t('steps.todayTotal', { steps: todaySteps.toLocaleString(language) })}</Text>}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${stepsProgress(steps, STEP_BONUS_CAP_STEPS) * 100}%` }]} />
      </View>
      <Text style={styles.body}>{t('steps.explain')}</Text>
      {!session ? (
        <Text style={styles.body}>{t('steps.needSession')}</Text>
      ) : (
        <Text style={styles.body}>
          {capReached
            ? t('steps.bonusMax', { bonus: formatClbPerHour(bonus, language), ...params })
            : t('steps.bonus', { bonus: formatClbPerHour(bonus, language), next: toNext.toLocaleString(language), ...params })}
        </Text>
      )}
      {syncFailed && <Text style={styles.error}>{t('steps.syncError')}</Text>}
      {!backgroundAccess && (
        <Pressable onPress={allowBackground} accessibilityRole="button">
          <Text style={styles.link}>{t('steps.background.button')}</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.md },
  title: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 1 },
  today: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.xs },
  body: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: theme.spacing.sm },
  link: { color: theme.colors.accent, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.xs + 0.5, marginTop: theme.spacing.sm },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
  button: { marginTop: theme.spacing.md },
  track: { height: 8, borderRadius: 4, backgroundColor: theme.colors.ringTrack, marginTop: theme.spacing.md, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
});
