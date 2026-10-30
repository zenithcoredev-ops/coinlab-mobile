import * as Location from 'expo-location';

import { readApproxCoords, roundCoords } from '../location';
import { getWeather } from '../weather-api';

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1 },
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({ ok: status < 300, status, json: async () => body });

describe('getWeather', () => {
  const weather = { temperatureC: -3.2, symbol: 'lightsnow', isDay: false, updatedAt: '2026-10-30T09:00:00Z' };

  it('asks the backend for the rounded position, without the session token', async () => {
    respond(200, weather);
    expect(await getWeather(41, 29)).toEqual(weather);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/weather\?lat=41&lon=29$/);
    expect(init?.headers).toBeUndefined();
  });

  it('is null on a server without the endpoint (404), errors and unexpected answers', async () => {
    respond(404, { error: 'Not found' });
    expect(await getWeather(41, 29)).toBeNull();
    respond(500, {});
    expect(await getWeather(41, 29)).toBeNull();
    respond(200, { temperatureC: 'warm' });
    expect(await getWeather(41, 29)).toBeNull();
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await getWeather(41, 29)).toBeNull();
  });
});

describe('location', () => {
  it('rounds to one decimal (~10 km)', () => {
    expect(roundCoords({ lat: 41.0369, lon: 28.9857 })).toEqual({ lat: 41, lon: 29 });
    expect(roundCoords({ lat: -33.8688, lon: 151.2093 })).toEqual({ lat: -33.9, lon: 151.2 });
  });

  it('uses a recent known position, else a low-accuracy fix, and only ever returns it rounded', async () => {
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue({ coords: { latitude: 39.9208, longitude: 32.8541 } });
    expect(await readApproxCoords()).toEqual({ lat: 39.9, lon: 32.9 });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();

    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue(null);
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({ coords: { latitude: 38.4237, longitude: 27.1428 } });
    expect(await readApproxCoords()).toEqual({ lat: 38.4, lon: 27.1 });
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Lowest });
  });
});
