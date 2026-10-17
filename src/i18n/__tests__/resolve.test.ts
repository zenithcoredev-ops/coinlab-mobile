jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({}));

import { getLocales } from 'expo-localization';

import { deviceLanguage, resolveLanguage } from '..';

describe('language resolution', () => {
  it('follows the device language when the preference is auto', () => {
    expect(resolveLanguage('auto', 'tr')).toBe('tr');
    expect(resolveLanguage('auto', 'en')).toBe('en');
  });

  it('lets an explicit preference win over the device', () => {
    expect(resolveLanguage('en', 'tr')).toBe('en');
    expect(resolveLanguage('tr', 'en')).toBe('tr');
  });

  it('maps Turkish devices to tr and everything else to en', () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'tr' }]);
    expect(deviceLanguage()).toBe('tr');
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'de' }]);
    expect(deviceLanguage()).toBe('en');
  });
});
