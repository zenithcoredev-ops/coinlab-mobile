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

/**
 * Text starting with this is not drawn: the patched widget library (patches/react-native-android-widget+*.patch,
 * ClockView.TEXT_PREFIX) puts a live Android TextClock over the text's box, so the time ticks every
 * minute without redrawing the widget. The date follows the device language.
 */
export const CLOCK_PREFIX = '@@textclock@@';
export type ClockSpec = { format24Hour: string; format12Hour: string; color: string; bold: boolean };
const clockText = (spec: ClockSpec) => CLOCK_PREFIX + JSON.stringify(spec);

const c = {
  bg: theme.colors.background,
  text: theme.colors.text,
  muted: theme.colors.textMuted,
  accent: theme.colors.accent,
  positive: theme.colors.positive,
  divider: 'rgba(255, 255, 255, 0.08)',
} as const;

function miningLine(m: WidgetModel): { text: string; color: string } {
  const t = (key: TranslationKey | PluralKey, params?: Record<string, string | number>) => translate(m.language, key, params);
  if (m.state === 'signedOut') return { text: t('widget.signedOut.hint'), color: c.accent };
  if (m.state !== 'active') return { text: t('widget.tapToStart'), color: c.accent };
  const { hours, minutes } = splitRemaining(m.remainingMs);
  const time = hours > 0 ? t('widget.time.hours', { hours }) : t('widget.time.minutes', { minutes });
  return { text: t('widget.mining.active', { time }), color: c.positive };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/**
 * One line of text in a fixed box. Nothing is ever cut off: the text shrinks to fit the box instead
 * (auto-size needs the explicit height), so the box's height sets the largest size it may use.
 */
function Line({ text, width, height, color, bold, align }: { text: string; width: number; height: number; color: string; bold?: boolean; align?: 'left' | 'right' }) {
  return (
    <TextWidget
      text={text}
      maxLines={1}
      style={{
        width,
        height,
        fontSize: Math.max(8, Math.floor(height / 1.35)),
        adjustsFontSizeToFit: true,
        color: color as `#${string}`,
        fontWeight: bold ? '700' : '400',
        textAlign: align ?? 'left',
      }}
    />
  );
}

export function MiningWidget({ name, model, size }: { name: MiningWidgetName; model: WidgetModel; size?: WidgetSize }) {
  const reported = size && size.width > 0 && size.height > 0 ? size : DEFAULT_SIZE[name];
  const cardW = Math.max(80, reported.width - SAFE_INSET);
  const cardH = Math.max(36, reported.height - SAFE_INSET);
  const pad = name === 'MiningSmall' ? 10 : 14;
  const innerW = cardW - pad * 2;
  const innerH = cardH - pad * 2;
  const mining = miningLine(model);
  const time = clockText({ format24Hour: 'HH:mm', format12Hour: 'h:mm', color: c.text, bold: true });

  const card = (children: ReactNode) => (
    // Outer layer is transparent; the card inside is what the user sees. Taps open the app.
    <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', height: 'match_parent' }}>
      <FlexWidget style={{ width: cardW, height: cardH, backgroundColor: c.bg, borderRadius: 20, padding: pad, justifyContent: 'space-between' }}>
        {children}
      </FlexWidget>
    </FlexWidget>
  );

  if (name === 'MiningSmall') {
    if (innerH < 30) {
      // Too short to stack: clock on the left, mining status beside it.
      const clockW = Math.floor(innerW * 0.36);
      return card(
        <FlexWidget style={{ width: innerW, height: innerH, flexDirection: 'row', alignItems: 'center' }}>
          <Line text={time} width={clockW} height={innerH} color={c.text} bold />
          <Line text={mining.text} width={innerW - clockW} height={Math.min(innerH, 14)} color={mining.color} align="right" />
        </FlexWidget>
      );
    }
    // Clock on top, mining status under it; the clock takes what the status line leaves.
    const lineH = clamp(innerH * 0.32, 10, 16);
    const clockH = innerH - lineH - 2;
    return card([
      <Line key="clock" text={time} width={innerW} height={clockH} color={c.text} bold />,
      <Line key="mining" text={mining.text} width={innerW} height={lineH} color={mining.color} />,
    ]);
  }

  // Large: clock and date, a divider, then the mining line with the brand on the right.
  const clockH = clamp(innerH * 0.4, 22, 56);
  const dateH = clamp(innerH * 0.14, 11, 18);
  const footerH = clamp(innerH * 0.16, 11, 18);
  const brandW = Math.floor(innerW * 0.26);
  const date = clockText({ format24Hour: 'EEEE, d MMMM', format12Hour: 'EEEE, d MMMM', color: c.muted, bold: false });
  return card([
    <FlexWidget key="top" style={{ width: innerW }}>
      <Line text={time} width={innerW} height={clockH} color={c.text} bold />
      <Line text={date} width={innerW} height={dateH} color={c.muted} />
    </FlexWidget>,
    <FlexWidget key="divider" style={{ width: innerW, height: 1, backgroundColor: c.divider }} />,
    <FlexWidget key="footer" style={{ width: innerW, flexDirection: 'row', alignItems: 'center' }}>
      <Line text={mining.text} width={innerW - brandW} height={footerH} color={mining.color} />
      <Line text={translate(model.language, 'app.name')} width={brandW} height={footerH} color={c.muted} bold align="right" />
    </FlexWidget>,
  ]);
}
