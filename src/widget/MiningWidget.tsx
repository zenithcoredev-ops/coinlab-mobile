"use no memo";
// The widget library calls components as plain functions (no React renderer); the React Compiler's
// memo cache would throw "Invalid hook call" there and leave the widget blank.
import type { ReactNode } from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { translate } from '@/i18n/translate';
import type { PluralKey, TranslationKey } from '@/i18n/en';
import { theme } from '@/theme';
import { splitRemaining, WidgetModel } from './model';

export type MiningWidgetName = 'MiningSmall' | 'MiningLarge';

/** Widget area in dp, as reported by the launcher. */
export type WidgetSize = { width: number; height: number };

// The library draws the widget into a bitmap as wide as the reported size and the launcher then
// clips it; on some launchers (MIUI) the visible area is smaller, which cut the right and bottom
// edges. The card is drawn this much smaller than reported (top-left aligned) so every corner shows.
const SAFE_INSET = 16;
const DEFAULT_SIZE: Record<MiningWidgetName, WidgetSize> = {
  MiningSmall: { width: 110, height: 40 },
  MiningLarge: { width: 250, height: 110 },
};

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
      : t(m.state === 'finished' ? 'widget.state.finished' : 'widget.state.idle');
  const detail =
    m.state === 'active'
      ? t(hours > 0 ? 'widget.remaining' : 'widget.remainingShort', { hours, minutes })
      : m.state === 'signedOut'
        ? t('widget.signedOut.hint')
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

export function MiningWidget({ name, model, size }: { name: MiningWidgetName; model: WidgetModel; size?: WidgetSize }) {
  const x = textsFor(model);
  const reported = size && size.width > 0 && size.height > 0 ? size : DEFAULT_SIZE[name];
  const cardW = Math.max(80, reported.width - SAFE_INSET);
  const cardH = Math.max(36, reported.height - SAFE_INSET);
  const pad = name === 'MiningSmall' ? 12 : 14;
  const innerW = cardW - pad * 2;
  const innerH = cardH - pad * 2;
  const card = {
    width: cardW,
    height: cardH,
    backgroundColor: c.bg,
    borderRadius: 20,
    padding: pad,
  } as const;
  const line = { maxLines: 1, truncate: 'END' } as const;

  // Outer layer is transparent; the card inside is what the user sees.
  const frame = (children: ReactNode | ReactNode[], justifyContent: 'center' | 'space-between') => (
    <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', height: 'match_parent' }}>
      <FlexWidget style={{ ...card, justifyContent }}>{children}</FlexWidget>
    </FlexWidget>
  );

  if (model.state === 'signedOut') {
    return frame(
      <TextWidget
        key="signin"
        text={x.detail}
        style={{ width: innerW, fontSize: name === 'MiningSmall' ? 15 : 20, color: c.text, fontWeight: '700', textAlign: 'center' }}
        maxLines={2}
        truncate="END"
      />,
      'center'
    );
  }

  if (name === 'MiningSmall') {
    return frame(
      [
        <TextWidget key="status" text={x.status} style={{ width: innerW, fontSize: 12, color: statusColor(model), fontWeight: '600' }} {...line} />,
        <TextWidget key="detail" text={x.detail} style={{ width: innerW, fontSize: 16, color: c.text, fontWeight: '700' }} {...line} />,
        <TextWidget key="balance" text={x.balance} style={{ width: innerW, fontSize: 12, color: c.accent }} {...line} />,
      ],
      'center'
    );
  }

  // Large: header, a centred main block, and a footer row. When short, the balance moves to the footer.
  const compact = innerH < 84;
  const main: ReactNode[] = [
    <TextWidget key="detail" text={x.detail} style={{ width: innerW, fontSize: compact ? 20 : 26, color: c.text, fontWeight: '700' }} {...line} />,
  ];
  if (!compact) {
    main.push(<TextWidget key="balance" text={x.balance} style={{ width: innerW, fontSize: 16, color: c.accent, fontWeight: '600' }} {...line} />);
  }
  // Footer columns share the inner width; tall widgets keep the balance in the main block instead.
  const columns = compact
    ? [
        { key: 'balance', text: x.balance, color: c.accent, ratio: 0.4, align: 'left' },
        { key: 'streak', text: x.streak, color: model.streakAtRisk ? c.danger : c.text, ratio: 0.28, align: 'center' },
        { key: 'steps', text: x.steps, color: c.text, ratio: 0.32, align: 'right' },
      ] as const
    : [
        { key: 'streak', text: x.streak, color: model.streakAtRisk ? c.danger : c.text, ratio: 0.5, align: 'left' },
        { key: 'steps', text: x.steps, color: c.text, ratio: 0.5, align: 'right' },
      ] as const;
  const footer = columns.map((col, i) => (
    <TextWidget
      key={col.key}
      text={col.text}
      style={{
        width: i === columns.length - 1 ? innerW - columns.slice(0, -1).reduce((sum, k) => sum + Math.floor(innerW * k.ratio), 0) : Math.floor(innerW * col.ratio),
        fontSize: 13,
        color: col.color,
        textAlign: col.align,
      }}
      {...line}
    />
  ));
  return frame(
    [
      <FlexWidget key="header" style={{ width: innerW, flexDirection: 'row' }}>
        <TextWidget text={x.app} style={{ width: Math.floor(innerW * 0.34), fontSize: 13, color: c.muted, fontWeight: '600' }} {...line} />
        <TextWidget
          text={x.status}
          style={{ width: innerW - Math.floor(innerW * 0.34), fontSize: 12, color: statusColor(model), fontWeight: '600', textAlign: 'right' }}
          {...line}
        />
      </FlexWidget>,
      <FlexWidget key="main" style={{ width: innerW }}>{main}</FlexWidget>,
      <FlexWidget key="footer" style={{ width: innerW, flexDirection: 'row' }}>
        {footer}
      </FlexWidget>,
    ],
    'space-between'
  );
}
