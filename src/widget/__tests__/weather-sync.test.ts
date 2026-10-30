import { hasApproxLocationPermission, readApproxCoords } from '@/services/location';
import { getWeather } from '@/services/weather-api';
import { loadCoords, loadWeather, saveCoords, setWeatherEnabled } from '../weather';
import { refreshWeatherInApp } from '../weather-sync';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/services/location', () => ({ hasApproxLocationPermission: jest.fn(), readApproxCoords: jest.fn() }));
jest.mock('@/services/weather-api', () => ({ getWeather: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const HOUR = 3_600_000;
const t0 = Date.parse('2026-10-30T10:00:00Z');

beforeEach(async () => {
  await AsyncStorage.clear();
  (hasApproxLocationPermission as jest.Mock).mockResolvedValue(true);
  (readApproxCoords as jest.Mock).mockReset().mockResolvedValue({ lat: 41, lon: 29 });
  (getWeather as jest.Mock).mockResolvedValue({ temperatureC: 18, symbol: 'fair_day', isDay: true, updatedAt: 'x' });
});

describe('refreshWeatherInApp', () => {
  it('does nothing while the switch is off', async () => {
    expect(await refreshWeatherInApp(t0)).toBe(false);
    expect(readApproxCoords).not.toHaveBeenCalled();
  });

  it('reads the position when missing or older than 3 hours, then fetches the weather', async () => {
    await setWeatherEnabled(true);
    expect(await refreshWeatherInApp(t0)).toBe(true);
    expect(await loadCoords()).toEqual({ lat: 41, lon: 29, savedAt: t0 });
    await refreshWeatherInApp(t0 + HOUR);
    expect(readApproxCoords).toHaveBeenCalledTimes(1);
    await refreshWeatherInApp(t0 + 4 * HOUR);
    expect(readApproxCoords).toHaveBeenCalledTimes(2);
  });

  it('drops the position and weather once location access is taken away', async () => {
    await setWeatherEnabled(true);
    await saveCoords({ lat: 41, lon: 29 }, t0);
    await refreshWeatherInApp(t0);
    (hasApproxLocationPermission as jest.Mock).mockResolvedValue(false);
    expect(await refreshWeatherInApp(t0 + HOUR)).toBe(true);
    expect(await loadCoords()).toBeNull();
    expect(await loadWeather()).toBeNull();
    expect(await refreshWeatherInApp(t0 + 2 * HOUR)).toBe(false); // nothing left to hide
  });
});
