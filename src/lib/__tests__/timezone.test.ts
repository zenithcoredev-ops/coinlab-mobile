import { getCalendars } from 'expo-localization';

import { deviceTimeZone, isIanaTimeZone, timeZoneToSync } from '../timezone';

jest.mock('expo-localization', () => ({ getCalendars: jest.fn() }));

const calendars = getCalendars as jest.Mock;
const intlZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe('isIanaTimeZone', () => {
  it('accepts region/city names and UTC, rejects bare offsets', () => {
    for (const zone of ['Europe/Istanbul', 'America/New_York', 'America/Argentina/Buenos_Aires', 'Etc/GMT+3', 'UTC']) {
      expect(isIanaTimeZone(zone)).toBe(true);
    }
    for (const zone of ['GMT+1', '+03:00', '', null, undefined]) {
      expect(isIanaTimeZone(zone)).toBe(false);
    }
  });
});

describe('deviceTimeZone', () => {
  it('prefers expo-localization', () => {
    calendars.mockReturnValue([{ timeZone: 'Europe/Istanbul' }]);
    expect(deviceTimeZone()).toBe('Europe/Istanbul');
  });

  it('falls back to Intl when the device reports no zone, an offset, or fails', () => {
    const fallback = isIanaTimeZone(intlZone) ? intlZone : null;
    calendars.mockReturnValue([{ timeZone: null }]);
    expect(deviceTimeZone()).toBe(fallback);
    calendars.mockReturnValue([{ timeZone: 'GMT+1' }]);
    expect(deviceTimeZone()).toBe(fallback);
    calendars.mockImplementation(() => {
      throw new Error('native module missing');
    });
    expect(deviceTimeZone()).toBe(fallback);
  });
});

describe('timeZoneToSync', () => {
  it('sends the device zone when the server has none or a different one', () => {
    expect(timeZoneToSync(null, 'Europe/Istanbul')).toBe('Europe/Istanbul');
    expect(timeZoneToSync('Europe/Istanbul', 'America/New_York')).toBe('America/New_York');
  });

  it('does nothing when they match, the device zone is unknown, or the server predates zones', () => {
    expect(timeZoneToSync('Europe/Istanbul', 'Europe/Istanbul')).toBeNull();
    expect(timeZoneToSync(null, null)).toBeNull();
    expect(timeZoneToSync(undefined, 'Europe/Istanbul')).toBeNull();
  });
});
