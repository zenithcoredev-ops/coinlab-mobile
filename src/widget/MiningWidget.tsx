"use no memo";
// The widget library calls components as plain functions (no React renderer); the React Compiler's
// memo cache would throw "Invalid hook call" there and leave the widget blank.
import type { ReactNode } from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { translate } from '@/i18n/translate';
import type { PluralKey, TranslationKey } from '@/i18n/en';
import { MINING_SESSION_MS } from '@/services/mining-api';
import { theme } from '@/theme';
import { cardFrameSvg, diamondSvg, GOLD, GREEN, pillSvg, progressBarSvg } from './art';
import { shownRemaining, WidgetModel } from './model';
import { STEP_GOAL } from './steps';
import { stepsRingSvg } from './steps-ring';
import { WEATHER_CONDITION_KEYS, weatherConditionFor } from './weather-conditions';
import { weatherIconFor, weatherIconSvg } from './weather-icons';

export type MiningWidgetName = 'MiningSmall' | 'MiningLarge';

/** Widget area in dp, as reported by the launcher. */
export type WidgetSize = { width: number; height: number };

// The library draws the widget into a bitmap as wide as the reported size and the launcher then
// clips it; on some launchers (MIUI) the visible area is smaller, which cut the right and bottom
// edges. The patched library now takes the narrowest reported width, and the card is drawn this much
// smaller than that, centred, so the margin is split evenly and every corner shows.
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
const timeClock = () => clockText({ format24Hour: 'HH:mm', format12Hour: 'h:mm', color: c.text, bold: true });
const dateClock = (format: string) => clockText({ format24Hour: format, format12Hour: format, color: c.soft, bold: false });

const c = {
  text: '#F4F6FA',
  soft: '#C9D1DC',
  muted: theme.colors.textMuted,
  faint: '#6B7A72',
  gold: GOLD,
  green: GREEN,
  divider: 'rgba(255, 255, 255, 0.08)',
} as const;

type Texts = ReturnType<typeof textsFor>;

function textsFor(m: WidgetModel) {
  const t = (key: TranslationKey | PluralKey, params?: Record<string, string | number>) => translate(m.language, key, params);
  const active = m.state === 'active';
  const left = active ? shownRemaining(m.remainingMs) : null;
  const time = left ? ('hours' in left ? t('widget.time.hours', left) : t('widget.time.minutes', left)) : '';
  const start = m.state === 'signedOut' ? t('widget.signedOut.hint') : t('widget.tapToStart');
  return {
    t,
    active,
    /** Large widget's label. */
    label: active ? t('widget.mining.active', { time }) : start,
    /** Small widget's label, and the shortest form for a very narrow one. */
    labelShort: active ? t('widget.mining.activeShort', { time }) : m.state === 'signedOut' ? start : t('widget.startShort'),
    labelTiny: active ? time : m.state === 'signedOut' ? start : t('widget.startTiny'),
    /** Share of the 24-hour session already mined; null when nothing is running. */
    progress: active ? Math.min(1, Math.max(0, 1 - m.remainingMs / MINING_SESSION_MS)) : null,
    temperature: m.weather ? `${Math.round(m.weather.temperatureC)}°` : null,
    condition: m.weather ? t(WEATHER_CONDITION_KEYS[weatherConditionFor(m.weather.symbol)]) : null,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/**
 * One line of text in a fixed box. Nothing is ever cut off: the text shrinks to fit the box instead
 * (auto-size needs the explicit height), so the box's height sets the largest size it may use.
 */
function Line(props: { text: string; width: number; height: number; color: string; bold?: boolean; align?: 'left' | 'center' | 'right'; glow?: string }) {
  const { text, width, height, color, bold, align, glow } = props;
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
        ...(glow ? { textShadowColor: glow as `#${string}`, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } } : {}),
      }}
    />
  );
}

/** The weather icon and temperature side by side. */
function WeatherRow({ model, temperature, width, height }: { model: WidgetModel; temperature: string; width: number; height: number }) {
  const icon = Math.min(height, Math.floor(width * 0.45));
  const w = model.weather!;
  return (
    <FlexWidget style={{ width, height, flexDirection: 'row', alignItems: 'center' }}>
      <SvgWidget svg={weatherIconSvg(weatherIconFor(w.symbol, w.isDay))} style={{ width: icon, height: icon, marginRight: 4 }} />
      <Line text={temperature} width={width - icon - 4} height={height} color={c.text} bold />
    </FlexWidget>
  );
}

/** The mining label: a glowing capsule (green while mining, gold otherwise) with a gem and the text. */
function Pill({ text, active, width, height }: { text: string; active: boolean; width: number; height: number }) {
  const tone = active ? c.green : c.gold;
  const gem = Math.round(height * 0.5);
  const sidePad = Math.round(height * 0.4);
  const textW = Math.max(10, width - 2 * sidePad - gem - 4);
  return (
    <OverlapWidget style={{ width, height }}>
      <SvgWidget svg={pillSvg(width, height, active ? 'green' : 'gold')} style={{ width, height }} />
      <FlexWidget style={{ width, height, flexDirection: 'row', alignItems: 'center', paddingLeft: sidePad, paddingRight: sidePad }}>
        <SvgWidget svg={diamondSvg(tone)} style={{ width: gem, height: gem, marginRight: 4 }} />
        <Line text={text} width={textW} height={Math.round(height * 0.5)} color={tone} bold glow={tone} />
      </FlexWidget>
    </OverlapWidget>
  );
}

/** The card: the SVG frame (glass, gold→green edge, glow) behind the content. Taps open the app. */
function Card({ width, height, pad, children }: { width: number; height: number; pad: number; children: ReactNode }) {
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
      <OverlapWidget style={{ width, height }}>
        <SvgWidget svg={cardFrameSvg(width, height)} style={{ width, height }} />
        <FlexWidget style={{ width, height, padding: pad, justifyContent: 'space-between' }}>{children}</FlexWidget>
      </OverlapWidget>
    </FlexWidget>
  );
}

export function MiningWidget({ name, model, size }: { name: MiningWidgetName; model: WidgetModel; size?: WidgetSize }) {
  const reported = size && size.width > 0 && size.height > 0 ? size : DEFAULT_SIZE[name];
  const cardW = Math.max(80, reported.width - SAFE_INSET);
  const cardH = Math.max(36, reported.height - SAFE_INSET);
  const x = textsFor(model);
  return name === 'MiningSmall' ? small(model, x, cardW, cardH) : large(model, x, cardW, cardH);
}

/**
 * Small (2x1). Top: clock, weather on the right. Bottom: short date, short mining label on the right,
 * a thin session bar under it when there is height. Too short for two rows: clock and label only.
 * Narrow: the date goes first, then the weather; the clock and the label always stay.
 */
function small(model: WidgetModel, x: Texts, cardW: number, cardH: number) {
  const pad = 10;
  const innerW = cardW - pad * 2;
  const innerH = cardH - pad * 2;
  const pillMin = 46;

  if (innerH < 34) {
    const clockW = Math.floor(innerW * 0.42);
    const pillW = innerW - clockW - 4;
    const pillH = Math.min(innerH, 22);
    return (
      <Card width={cardW} height={cardH} pad={pad}>
        <FlexWidget style={{ width: innerW, height: innerH, flexDirection: 'row', alignItems: 'center' }}>
          <Line text={timeClock()} width={clockW} height={innerH} color={c.text} bold />
          <FlexWidget style={{ width: 4, height: 1 }} />
          <Pill text={pillW < 90 ? x.labelTiny : x.labelShort} active={x.active} width={pillW} height={pillH} />
        </FlexWidget>
      </Card>
    );
  }

  const topH = Math.round(innerH * 0.55);
  const bottomH = innerH - topH;
  const showWeather = !!x.temperature && innerW >= 110;
  const weatherW = showWeather ? Math.floor(innerW * 0.38) : 0;
  const showDate = innerW >= 150;
  const dateW = showDate ? Math.floor(innerW * 0.42) : 0;
  const pillW = Math.max(pillMin, innerW - dateW - (showDate ? 6 : 0));
  const withBar = x.progress !== null && bottomH >= 24;
  const pillH = Math.min(withBar ? bottomH - 6 : bottomH, 24);

  return (
    <Card width={cardW} height={cardH} pad={pad}>
      <FlexWidget style={{ width: innerW, height: topH, flexDirection: 'row', alignItems: 'center' }}>
        <Line text={timeClock()} width={innerW - weatherW} height={topH} color={c.text} bold />
        {showWeather ? <WeatherRow model={model} temperature={x.temperature!} width={weatherW} height={Math.round(topH * 0.7)} /> : null}
      </FlexWidget>
      <FlexWidget style={{ width: innerW, height: bottomH, flexDirection: 'row', alignItems: 'center' }}>
        {showDate ? <Line text={dateClock('d MMM EEE')} width={dateW} height={Math.min(bottomH, 14)} color={c.soft} /> : null}
        {showDate ? <FlexWidget style={{ width: 6, height: 1 }} /> : null}
        <FlexWidget style={{ width: pillW }}>
          <Pill text={pillW < 90 ? x.labelTiny : x.labelShort} active={x.active} width={pillW} height={pillH} />
          {withBar ? <SvgWidget svg={progressBarSvg(pillW - 8, 3, x.progress!)} style={{ width: pillW - 8, height: 3, marginTop: 3, marginLeft: 4 }} /> : null}
        </FlexWidget>
      </FlexWidget>
    </Card>
  );
}

/**
 * Large (4x2). Top: clock and date on the left; weather icon, temperature and condition on the right.
 * A divider. Bottom: the gold steps ring with the count inside; the mining label with the session bar
 * under it; the brand, faint, bottom right. What doesn't fit goes, in this order: the condition, the
 * brand, the session bar, "Bugün" and then "adım" in the ring. Text is never cut.
 */
function large(model: WidgetModel, x: Texts, cardW: number, cardH: number) {
  const pad = 16;
  const innerW = cardW - pad * 2;
  const innerH = cardH - pad * 2;
  const { t } = x;

  // Top
  const topH = Math.round(innerH * 0.52);
  const dateH = clamp(topH * 0.24, 11, 22);
  const clockH = topH - dateH - 2;
  const weatherW = x.temperature ? Math.floor(innerW * (innerW < 240 ? 0.34 : 0.4)) : 0;
  const tempH = Math.round(clockH * 0.78);
  const showCondition = !!x.condition && innerW >= 240 && topH - tempH >= 13;

  // Bottom
  const bottomH = innerH - topH - 9; // divider with 4dp on each side
  const steps = model.stepsToday;
  const ring = steps !== null ? Math.min(bottomH, Math.floor(innerW * 0.32)) : 0;
  const gap = ring ? 12 : 0;
  const rightW = innerW - ring - gap;
  const pillH = clamp(bottomH * 0.42, 18, 36);
  const barH = 4;
  const brandH = clamp(bottomH * 0.18, 9, 13);
  const withBar = x.progress !== null && bottomH >= pillH + barH + 6;
  const withBrand = bottomH >= pillH + (withBar ? barH + 6 : 0) + brandH + 8;

  const ringLines: ReactNode[] = [];
  if (steps !== null) {
    const countH = Math.round(ring * 0.26);
    const labelH = Math.round(ring * 0.15);
    const withUnit = ring >= 40;
    const withToday = ring >= 56;
    const inner = Math.round(ring * 0.62);
    ringLines.push(<Line key="count" text={steps.toLocaleString(model.language)} width={inner} height={countH} color={c.gold} bold align="center" />);
    if (withUnit) ringLines.push(<Line key="unit" text={t('widget.stepsUnit')} width={inner} height={labelH} color={c.gold} align="center" />);
    if (withToday) ringLines.push(<Line key="today" text={t('widget.stepsToday')} width={inner} height={labelH} color={c.gold} align="center" />);
  }

  return (
    <Card width={cardW} height={cardH} pad={pad}>
      <FlexWidget style={{ width: innerW, height: topH, flexDirection: 'row' }}>
        <FlexWidget style={{ width: innerW - weatherW }}>
          <Line text={timeClock()} width={innerW - weatherW} height={clockH} color={c.text} bold />
          <FlexWidget style={{ width: 1, height: 2 }} />
          <Line text={dateClock('d MMMM EEEE')} width={innerW - weatherW} height={dateH} color={c.soft} />
        </FlexWidget>
        {x.temperature ? (
          <FlexWidget style={{ width: weatherW }}>
            <WeatherRow model={model} temperature={x.temperature} width={weatherW} height={tempH} />
            {showCondition ? <Line text={x.condition!} width={weatherW} height={Math.min(topH - tempH, 18)} color={c.soft} align="right" /> : null}
          </FlexWidget>
        ) : null}
      </FlexWidget>
      <FlexWidget style={{ width: innerW, height: 1, backgroundColor: c.divider }} />
      <FlexWidget style={{ width: innerW, height: bottomH, flexDirection: 'row', alignItems: 'center' }}>
        {steps !== null ? (
          <OverlapWidget style={{ width: ring, height: ring }}>
            <SvgWidget svg={stepsRingSvg(steps / STEP_GOAL)} style={{ width: ring, height: ring }} />
            <FlexWidget style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>{ringLines}</FlexWidget>
          </OverlapWidget>
        ) : null}
        {gap ? <FlexWidget style={{ width: gap, height: 1 }} /> : null}
        <FlexWidget style={{ width: rightW, height: bottomH, justifyContent: 'center', alignItems: 'flex-end' }}>
          <Pill text={x.label} active={x.active} width={rightW} height={pillH} />
          {withBar ? (
            <SvgWidget svg={progressBarSvg(rightW - 16, barH, x.progress!)} style={{ width: rightW - 16, height: barH, marginTop: 6, marginRight: 8 }} />
          ) : null}
          {withBrand ? <Line text={t('app.name')} width={Math.floor(rightW * 0.4)} height={brandH} color={c.faint} bold align="right" /> : null}
        </FlexWidget>
      </FlexWidget>
    </Card>
  );
}
