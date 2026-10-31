import type { TranslationKey } from '@/i18n/en';

export type WeatherCondition =
  | 'clear'
  | 'fair'
  | 'partlyCloudy'
  | 'cloudy'
  | 'fog'
  | 'lightRain'
  | 'rain'
  | 'heavyRain'
  | 'showers'
  | 'sleet'
  | 'lightSnow'
  | 'snow'
  | 'thunder';

/** The words under the temperature, from a MET Norway symbol code (suffix _day/_night/... ignored). */
export function weatherConditionFor(symbol: string): WeatherCondition {
  const condition = symbol.toLowerCase().split('_')[0];
  if (condition.includes('thunder')) return 'thunder';
  if (condition.includes('sleet')) return 'sleet';
  if (condition.includes('snow')) return condition.startsWith('light') ? 'lightSnow' : 'snow';
  if (condition.includes('rain')) {
    if (condition.startsWith('light')) return 'lightRain';
    if (condition.includes('showers')) return 'showers';
    return condition.startsWith('heavy') ? 'heavyRain' : 'rain';
  }
  if (condition === 'clearsky') return 'clear';
  if (condition === 'fair') return 'fair';
  if (condition === 'partlycloudy') return 'partlyCloudy';
  if (condition === 'fog') return 'fog';
  return 'cloudy';
}

export const WEATHER_CONDITION_KEYS: Record<WeatherCondition, TranslationKey> = {
  clear: 'weather.clear',
  fair: 'weather.fair',
  partlyCloudy: 'weather.partlyCloudy',
  cloudy: 'weather.cloudy',
  fog: 'weather.fog',
  lightRain: 'weather.lightRain',
  rain: 'weather.rain',
  heavyRain: 'weather.heavyRain',
  showers: 'weather.showers',
  sleet: 'weather.sleet',
  lightSnow: 'weather.lightSnow',
  snow: 'weather.snow',
  thunder: 'weather.thunder',
};

/** Shorter words for the small widget, where the full ones don't fit (same as full when already short). */
export const WEATHER_CONDITION_SHORT_KEYS: Record<WeatherCondition, TranslationKey> = {
  ...WEATHER_CONDITION_KEYS,
  fair: 'weather.short.fair',
  partlyCloudy: 'weather.short.partlyCloudy',
  lightRain: 'weather.short.lightRain',
  heavyRain: 'weather.short.heavyRain',
  sleet: 'weather.short.sleet',
  lightSnow: 'weather.short.lightSnow',
  thunder: 'weather.short.thunder',
};
