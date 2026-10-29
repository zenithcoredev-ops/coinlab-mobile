import { updateTimeZone } from '../me-api';
import { localUtcOffsetMinutes, startMining } from '../mining-api';

jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: 'Europe/Istanbul' }] }));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200, json: async () => ({}), headers: { get: () => null } });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const lastBody = () => JSON.parse(fetchMock.mock.calls[0][1].body);

describe('time zone requests', () => {
  it('reports the UTC offset as minutes ahead of UTC', () => {
    const at = (offset: number) => ({ getTimezoneOffset: () => offset }) as Date;
    expect(localUtcOffsetMinutes(at(-180))).toBe(180); // Istanbul, UTC+3
    expect(localUtcOffsetMinutes(at(300))).toBe(-300); // New York in winter, UTC-5
  });

  it('starts mining with both the IANA zone and the legacy offset', async () => {
    await startMining('tok');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/mining\/start$/);
    const body = lastBody();
    expect(body).toEqual({ timezone: 'Europe/Istanbul', tzOffsetMinutes: expect.any(Number) });
    // === so UTC's -0 (sent as 0) still matches.
    expect(body.tzOffsetMinutes === localUtcOffsetMinutes()).toBe(true);
  });

  it('updates the stored zone with PATCH /me/timezone', async () => {
    await updateTimeZone('tok', 'America/New_York');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/me\/timezone$/);
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(lastBody()).toEqual({ timezone: 'America/New_York' });
  });
});
