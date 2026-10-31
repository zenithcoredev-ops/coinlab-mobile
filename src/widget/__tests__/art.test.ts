import { translate } from '@/i18n/translate';
import { cardFrameSvg, diamondSvg, pillSvg, progressBarSvg } from '../art';
import { widgetDrawKey, buildWidgetModel } from '../model';
import { stepsRingSvg } from '../steps-ring';
import { WEATHER_CONDITION_KEYS, weatherConditionFor } from '../weather-conditions';
import { weatherIconSvg } from '../weather-icons';

jest.mock('@react-native-async-storage/async-storage', () => ({}));

/** Tags balance and every attribute is quoted: a malformed SVG makes AndroidSVG draw nothing. */
function expectWellFormed(svg: string) {
  const stack: string[] = [];
  for (const [tag] of svg.matchAll(/<[^>]+>/g)) {
    expect(tag).toMatch(/^<\/?[a-zA-Z][\w-]*(\s+[\w:-]+="[^"]*")*\s*\/?>$/);
    const name = /^<\/?([\w-]+)/.exec(tag)![1];
    if (tag.startsWith('</')) expect(stack.pop()).toBe(name);
    else if (!tag.endsWith('/>')) stack.push(name);
  }
  expect(stack).toEqual([]);
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
}

describe('widget art', () => {
  it('is well-formed SVG at any size and progress', () => {
    for (const [w, h] of [[94, 24], [234, 94], [404, 244]]) expectWellFormed(cardFrameSvg(w, h));
    for (const tone of ['green', 'gold'] as const) expectWellFormed(pillSvg(180, 30, tone));
    for (const p of [0, 0.004, 0.63, 1, 1.4, -1]) {
      expectWellFormed(progressBarSvg(160, 4, p));
      expectWellFormed(stepsRingSvg(p));
    }
    expectWellFormed(diamondSvg('#4ADE80'));
    for (const icon of ['clear-day', 'partly-night', 'rain', 'snow', 'thunder', 'fog'] as const) expectWellFormed(weatherIconSvg(icon));
  });

  it('fills the session bar in proportion, never past the end', () => {
    const fill = (p: number) => Number(/<rect x="0" y="0" width="([\d.]+)" height="4" rx="2" fill="url\(#fill\)"/.exec(progressBarSvg(100, 4, p))?.[1] ?? 0);
    expect(fill(0)).toBe(0);
    expect(fill(0.5)).toBe(50);
    expect(fill(2)).toBe(100);
    expect(fill(0.01)).toBe(4); // a sliver still shows as a dot
  });
});

describe('weather condition', () => {
  it.each([
    ['clearsky_day', 'Açık'],
    ['fair_night', 'Az bulutlu'],
    ['partlycloudy_day', 'Parçalı bulutlu'],
    ['cloudy', 'Bulutlu'],
    ['fog', 'Sisli'],
    ['lightrain', 'Hafif yağışlı'],
    ['lightrainshowers_day', 'Hafif yağışlı'],
    ['rain', 'Yağmurlu'],
    ['heavyrain', 'Kuvvetli yağış'],
    ['rainshowers_night', 'Sağanak'],
    ['heavyrainshowers_day', 'Sağanak'],
    ['sleetshowers_day', 'Karla karışık yağmur'],
    ['lightsnow', 'Hafif karlı'],
    ['heavysnowshowers_night', 'Karlı'],
    ['lightssleetshowersandthunder_day', 'Gök gürültülü'],
    ['brandnewcode', 'Bulutlu'],
  ])('%s → %s', (symbol, tr) => {
    const key = WEATHER_CONDITION_KEYS[weatherConditionFor(symbol)];
    expect(translate('tr', key)).toBe(tr);
    expect(translate('en', key)).not.toBe(key); // has an English text too
  });

  it('redraws when only the condition changes', () => {
    const at = (symbol: string) =>
      widgetDrawKey(buildWidgetModel(null, 0, 'tr', { weather: { temperatureC: 12, symbol, isDay: true, updatedAt: '' } }));
    expect(at('lightrain')).not.toBe(at('rain')); // same icon, different words
  });
});
