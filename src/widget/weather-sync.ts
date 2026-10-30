import { hasApproxLocationPermission, readApproxCoords } from '@/services/location';
import { COORDS_MAX_AGE_MS, forgetCoords, isWeatherEnabled, loadCoords, saveCoords, updateWeather } from './weather';

/**
 * In the app only (location is never read in the background): re-reads the approximate position
 * when it's older than 3 hours, then fetches the weather if due. Resolves whether the widget needs
 * a redraw. If location access was taken away, the weather is dropped.
 */
export async function refreshWeatherInApp(now = Date.now()): Promise<boolean> {
  if (!(await isWeatherEnabled())) return false;
  if (!(await hasApproxLocationPermission())) {
    const had = !!(await loadCoords());
    await forgetCoords();
    return had;
  }
  const coords = await loadCoords();
  if (!coords || now - coords.savedAt > COORDS_MAX_AGE_MS) {
    const fresh = await readApproxCoords();
    if (fresh) await saveCoords(fresh, now);
  }
  return updateWeather(now);
}
