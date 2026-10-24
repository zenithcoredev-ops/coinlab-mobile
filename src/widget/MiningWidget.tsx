"use no memo";
// The widget library calls components as plain functions (no React renderer); the React Compiler's
// memo cache would throw "Invalid hook call" there and leave the widget blank.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { translate } from '@/i18n/translate';
import type { PluralKey, TranslationKey } from '@/i18n/en';
import { theme } from '@/theme';
import { splitRemaining, WidgetModel } from './model';

export type MiningWidgetName = 'MiningSmall' | 'MiningLarge';

const c = {
  bg: theme.colors.background,
  surface: theme.colors.surface,
  text: theme.colors.text,
  muted: theme.colors.textMuted,
  accent: theme.colors.accent,
  positive: theme.colors.positive,
  danger: theme.colors.danger,
} as const;

function textsFor(m: WidgetModel) {
  const t = (key: TranslationKey | PluralKey, params?: Record<string, string | number>) => translate(m.language, key, params);
  const unitParams = { clb: t('unit.clb'), ths: t('unit.ths') };

  const { hours, minutes } = splitRemaining(m.remainingMs);
  const status =
    m.state === 'active'
      ? t('widget.state.active', { rate: m.ths.toFixed(2), ...unitParams })
      : t(m.state === 'finished' ? 'widget.state.finished' : m.state === 'idle' ? 'widget.state.idle' : 'widget.state.signedOut');
  const detail =
    m.state === 'active'
      ? t(hours > 0 ? 'widget.remaining' : 'widget.remainingShort', { hours, minutes })
      : m.state === 'signedOut'
        ? t('widget.signedOut.hint', { app: t('app.name') })
        : t('widget.tapToStart');

  return {
    status,
    detail,
    balance: t('widget.balance', { balance: m.balance.toFixed(2), ...unitParams }),
    streak: t('streak.days', { count: m.streak }),
    steps: t('widget.steps', { steps: m.steps.toLocaleString(m.language) }),
    app: t('app.name'),
  };
}

const statusColor = (m: WidgetModel) => (m.state === 'active' ? c.positive : m.state === 'finished' ? c.accent : c.muted);

export function MiningWidget({ name, model }: { name: MiningWidgetName; model: WidgetModel }) {
  const x = textsFor(model);
  const signedIn = model.state !== 'signedOut';

  if (name === 'MiningSmall') {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 20, padding: 12, justifyContent: 'center' }}>
        <TextWidget text={x.status} style={{ fontSize: 12, color: statusColor(model), fontWeight: '600' }} maxLines={1} truncate="END" />
        <TextWidget text={x.detail} style={{ fontSize: 18, color: c.text, fontWeight: '700' }} maxLines={1} truncate="END" />
        {signedIn && (
          <TextWidget text={x.balance} style={{ fontSize: 12, color: c.accent }} maxLines={1} truncate="END" />
        )}
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 24, padding: 16, justifyContent: 'space-between' }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={x.app} style={{ fontSize: 14, color: c.muted, fontWeight: '600' }} />
        <TextWidget text={x.status} style={{ fontSize: 12, color: statusColor(model), fontWeight: '600' }} maxLines={1} truncate="END" />
      </FlexWidget>
      <TextWidget text={x.detail} style={{ fontSize: 26, color: c.text, fontWeight: '700' }} maxLines={2} truncate="END" />
      {signedIn && (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextWidget text={x.balance} style={{ fontSize: 14, color: c.accent, fontWeight: '600' }} maxLines={1} />
          <TextWidget text={x.streak} style={{ fontSize: 14, color: model.streakAtRisk ? c.danger : c.text }} maxLines={1} />
          <TextWidget text={x.steps} style={{ fontSize: 14, color: c.text }} maxLines={1} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
