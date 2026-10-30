import * as Location from 'expo-location';

export type Coords = { lat: number; lon: number };

/** Only an approximate (~10 km) position ever leaves the device. */
export function roundCoords({ lat, lon }: Coords): Coords {
  const round = (v: number) => Math.round(v * 10) / 10;
  return { lat: round(lat), lon: round(lon) };
}

// The app declares only ACCESS_COARSE_LOCATION (fine and background are blocked in app.json), so
// Android asks for, and grants, approximate location only.
export async function requestApproxLocationPermission(): Promise<boolean> {
  try {
    return (await Location.requestForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function hasApproxLocationPermission(): Promise<boolean> {
  try {
    return (await Location.getForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** A recent known position if there is one (cheap), else a fresh low-accuracy fix; rounded. */
export async function readApproxCoords(): Promise<Coords | null> {
  try {
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 3 * 60 * 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
    return roundCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
  } catch {
    return null;
  }
}
