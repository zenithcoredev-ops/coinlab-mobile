import { getWeather } from '@/services/weather-api';
import { weatherIconFor, weatherIconSvg } from '../weather-icons';
import {
  isWeatherEnabled,
  loadCoords,
  loadWeather,
  saveCoords,
  setWeatherEnabled,
  updateWeather,
  weatherForWidget,
} from '../weather';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/services/weather-api', () => ({ getWeather: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const fetchWeather = getWeather as jest.Mock;
const MIN = 60_000;
const t0 = Date.parse('2026-10-30T10:00:00Z');
const sunny = { temperatureC: 22.4, symbol: 'clearsky_day', isDay: true, updatedAt: '2026-10-30T09:55:00Z' };
const istanbul = { lat: 41, lon: 29 };

beforeEach(async () => {
  await AsyncStorage.clear();
  fetchWeather.mockReset().mockResolvedValue(sunny);
});

describe('widget weather', () => {
  it('is off by default and does nothing until switched on with a position', async () => {
    expect(await isWeatherEnabled()).toBe(false);
    await saveCoords(istanbul, t0);
    expect(await updateWeather(t0)).toBe(false);
    await setWeatherEnabled(true);
    await AsyncStorage.removeItem('coinlab_widget_coords');
    expect(await updateWeather(t0)).toBe(false);
    expect(fetchWeather).not.toHaveBeenCalled();
  });

  it('fetches for the saved position, then at most every 45 minutes or when the place changes', async () => {
    await setWeatherEnabled(true);
    await saveCoords(istanbul, t0);
    expect(await updateWeather(t0)).toBe(true);
    expect(fetchWeather).toHaveBeenCalledWith(41, 29);
    expect(weatherForWidget(true, await loadWeather(), t0)).toEqual(sunny);

    expect(await updateWeather(t0 + 30 * MIN)).toBe(false);
    expect(fetchWeather).toHaveBeenCalledTimes(1);
    expect(await updateWeather(t0 + 46 * MIN)).toBe(false); // fetched again, same weather: no redraw
    expect(fetchWeather).toHaveBeenCalledTimes(2);

    await saveCoords({ lat: 39.9, lon: 32.9 }, t0 + 50 * MIN);
    fetchWeather.mockResolvedValue({ ...sunny, temperatureC: 15, symbol: 'rain' });
    expect(await updateWeather(t0 + 51 * MIN)).toBe(true);
    expect(fetchWeather).toHaveBeenLastCalledWith(39.9, 32.9);
  });

  it('keeps the last weather when the server has no /weather yet (404) or fails', async () => {
    await setWeatherEnabled(true);
    await saveCoords(istanbul, t0);
    fetchWeather.mockResolvedValue(null);
    expect(await updateWeather(t0)).toBe(false);
    expect(await loadWeather()).toBeNull();
    expect(weatherForWidget(true, await loadWeather(), t0)).toBeNull(); // the widget hides it
  });

  it('hides weather that is switched off or older than 3 hours', async () => {
    const stored = { ...sunny, ...istanbul, fetchedAt: t0 };
    expect(weatherForWidget(false, stored, t0)).toBeNull();
    expect(weatherForWidget(true, stored, t0 + 2 * 60 * MIN)).toEqual(sunny);
    expect(weatherForWidget(true, stored, t0 + 3 * 60 * MIN + 1)).toBeNull();
  });

  it('forgets the position and weather when switched off', async () => {
    await setWeatherEnabled(true);
    await saveCoords(istanbul, t0);
    await updateWeather(t0);
    await setWeatherEnabled(false);
    expect(await loadCoords()).toBeNull();
    expect(await loadWeather()).toBeNull();
  });
});

describe('weather icons', () => {
  it.each([
    ['clearsky_day', true, 'clear-day'],
    ['clearsky_night', true, 'clear-night'],
    ['clearsky_polartwilight', false, 'clear-day'],
    ['fair_night', true, 'partly-night'],
    ['partlycloudy_day', false, 'partly-day'],
    ['cloudy', true, 'cloudy'],
    ['fog', true, 'fog'],
    ['lightrain', true, 'rain'],
    ['heavyrainshowers_night', false, 'rain'],
    ['sleet', true, 'sleet'],
    ['lightssleetshowersandthunder_day', true, 'thunder'],
    ['heavysnowshowers_day', true, 'snow'],
    ['rainandthunder', true, 'thunder'],
    ['somethingnew', true, 'cloudy'],
  ] as const)('%s → %s', (symbol, isDay, icon) => {
    expect(weatherIconFor(symbol, isDay)).toBe(icon);
    expect(weatherIconSvg(icon)).toMatch(/^<svg [^>]*viewBox="0 0 24 24">.+<\/svg>$/);
  });
});
