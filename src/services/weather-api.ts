import { API_URL } from '@/constants/config';

/** GET /weather: current conditions from MET Norway, through the backend. */
export type Weather = {
  temperatureC: number;
  /** MET Norway symbol code, e.g. "partlycloudy_day", "lightrain", "heavyrainandthunder". */
  symbol: string;
  isDay: boolean;
  /** ISO-8601. */
  updatedAt: string;
};

function isWeather(value: unknown): value is Weather {
  const w = value as Weather;
  return (
    !!w &&
    typeof w.temperatureC === 'number' &&
    Number.isFinite(w.temperatureC) &&
    typeof w.symbol === 'string' &&
    typeof w.isDay === 'boolean' &&
    typeof w.updatedAt === 'string'
  );
}

/**
 * Current weather near (lat, lon), or null when there's none to show: a server without the endpoint
 * (404), any other error, or an unexpected answer. Sent without the session token: the widget calls
 * it in the background, where it never handles auth.
 */
export async function getWeather(lat: number, lon: number, timeoutMs = 8000): Promise<Weather | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/weather?lat=${lat}&lon=${lon}`, { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    return isWeather(body) ? body : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
