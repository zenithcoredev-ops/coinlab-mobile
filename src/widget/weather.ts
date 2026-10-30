import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Coords } from '@/services/location';
import { getWeather, Weather } from '@/services/weather-api';

const ENABLED_KEY = 'coinlab_widget_weather_enabled';
const COORDS_KEY = 'coinlab_widget_coords';
const WEATHER_KEY = 'coinlab_widget_weather';

/** Weather is fetched again after this long (the asked-for 30–60 minutes). */
export const WEATHER_MAX_AGE_MS = 45 * 60_000;
/** Older than this the widget hides the weather rather than show a stale temperature. */
export const WEATHER_SHOW_MAX_AGE_MS = 3 * 60 * 60_000;
/** The position is re-read (in the app only) when older than this. */
export const COORDS_MAX_AGE_MS = 3 * 60 * 60_000;

type StoredCoords = Coords & { savedAt: number };
type StoredWeather = Weather & Coords & { fetchedAt: number };

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** The Profile switch; off by default. */
export async function isWeatherEnabled(): Promise<boolean> {
  return (await read<boolean>(ENABLED_KEY)) === true;
}

/** Turning it off also forgets the position and the last weather. */
export async function setWeatherEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, JSON.stringify(enabled));
  if (!enabled) await AsyncStorage.multiRemove([COORDS_KEY, WEATHER_KEY]);
}

export async function loadCoords(): Promise<StoredCoords | null> {
  return read<StoredCoords>(COORDS_KEY);
}

export async function saveCoords(coords: Coords, now: number): Promise<void> {
  await AsyncStorage.setItem(COORDS_KEY, JSON.stringify({ ...coords, savedAt: now }));
}

/** Location permission was taken away: stop showing (and fetching) weather for the old place. */
export async function forgetCoords(): Promise<void> {
  await AsyncStorage.multiRemove([COORDS_KEY, WEATHER_KEY]);
}

export async function loadWeather(): Promise<StoredWeather | null> {
  return read<StoredWeather>(WEATHER_KEY);
}

/** What the widget draws: nothing when switched off, never fetched, or too old. */
export function weatherForWidget(enabled: boolean, stored: StoredWeather | null, now: number): Weather | null {
  if (!enabled || !stored || now - stored.fetchedAt > WEATHER_SHOW_MAX_AGE_MS) return null;
  const { temperatureC, symbol, isDay, updatedAt } = stored;
  return { temperatureC, symbol, isDay, updatedAt };
}

/**
 * Fetches the weather for the saved position when the last one is older than 45 minutes (or for
 * another place); resolves whether what the widget shows changed. Needs no location access itself,
 * so the widget can run it in the background. A failed fetch (no network, no endpoint yet) keeps
 * what was there.
 */
export async function updateWeather(now: number): Promise<boolean> {
  if (!(await isWeatherEnabled())) return false;
  const coords = await loadCoords();
  if (!coords) return false;
  const stored = await loadWeather();
  const samePlace = stored?.lat === coords.lat && stored?.lon === coords.lon;
  if (stored && samePlace && now - stored.fetchedAt < WEATHER_MAX_AGE_MS) return false;

  const weather = await getWeather(coords.lat, coords.lon);
  if (!weather) return false;
  await AsyncStorage.setItem(WEATHER_KEY, JSON.stringify({ ...weather, lat: coords.lat, lon: coords.lon, fetchedAt: now }));
  const before = weatherForWidget(true, stored, now);
  return before?.temperatureC !== weather.temperatureC || before?.symbol !== weather.symbol || before?.isDay !== weather.isDay;
}
