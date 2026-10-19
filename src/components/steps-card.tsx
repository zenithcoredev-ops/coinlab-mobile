import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { useSteps } from '@/context/steps';
import { useMining } from '@/context/mining';
import { useI18n } from '@/i18n';
import { stepsProgress } from '@/lib/health-steps';
import { STEP_BONUS_CAP_STEPS, STEPS_PER_BONUS_UNIT } from '@/services/steps-api';
import { theme } from '@/theme';

// Bonus per STEPS_PER_BONUS_UNIT comes from the server's breakdown, not a client constant.
export function StepsCard() {
  const { t } = useI18n();
  const { availability, steps, syncFailed, connect, openStore } = useSteps();
  const { status } = useMining();

  if (availability === 'unsupported') return null;

  const params = { app: t('app.name'), clb: t('unit.clb'), ths: t('unit.ths') };

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
  const bonus = status?.thsBreakdown.steps ?? 0;
  const capReached = steps >= STEP_BONUS_CAP_STEPS;
  const toNext = STEPS_PER_BONUS_UNIT - (steps % STEPS_PER_BONUS_UNIT);

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{t('steps.title')}</Text>
        <Text style={styles.value}>
          {t('steps.progress', { steps: steps.toLocaleString(), cap: STEP_BONUS_CAP_STEPS.toLocaleString() })}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${stepsProgress(steps, STEP_BONUS_CAP_STEPS) * 100}%` }]} />
      </View>
      {!session ? (
        <Text style={styles.body}>{t('steps.needSession')}</Text>
      ) : (
        <Text style={styles.body}>
          {capReached
            ? t('steps.bonusMax', { bonus: bonus.toFixed(2), ...params })
            : t('steps.bonus', { bonus: bonus.toFixed(2), next: toNext.toLocaleString(), ...params })}
        </Text>
      )}
      {syncFailed && <Text style={styles.error}>{t('steps.syncError')}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 1 },
  value: { color: theme.colors.accent, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.sm },
  body: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: theme.spacing.sm },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
  button: { marginTop: theme.spacing.md },
  track: { height: 8, borderRadius: 4, backgroundColor: theme.colors.ringTrack, marginTop: theme.spacing.md, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
});
