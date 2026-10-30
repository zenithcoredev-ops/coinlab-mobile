import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

import { isXiaomiDevice, openAutostartSettings, openBatterySettings } from '../miui';

jest.mock('expo-intent-launcher', () => ({ startActivityAsync: jest.fn() }));
jest.mock('expo-constants', () => ({ expoConfig: { android: { package: 'com.zenithcore.coinlab' } } }));

const start = IntentLauncher.startActivityAsync as jest.Mock;

function onDevice(os: string, constants: object) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  Object.defineProperty(Platform, 'constants', { configurable: true, get: () => constants });
}

beforeEach(() => {
  start.mockReset().mockResolvedValue({ resultCode: 0 });
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
});

describe('miui', () => {
  it('recognises Xiaomi, Redmi and POCO phones on Android only', () => {
    onDevice('android', { Manufacturer: 'Xiaomi', Brand: 'Redmi' });
    expect(isXiaomiDevice()).toBe(true);
    onDevice('android', { Manufacturer: 'Xiaomi', Brand: 'POCO' });
    expect(isXiaomiDevice()).toBe(true);
    onDevice('android', { Manufacturer: 'samsung', Brand: 'samsung' });
    expect(isXiaomiDevice()).toBe(false);
    onDevice('ios', { Manufacturer: 'Xiaomi' });
    expect(isXiaomiDevice()).toBe(false);
  });

  it('opens the Autostart list, or the app settings when MIUI has no such screen', async () => {
    await openAutostartSettings();
    expect(start).toHaveBeenCalledWith('android.intent.action.MAIN', {
      packageName: 'com.miui.securitycenter',
      className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
      extra: undefined,
    });
    expect(Linking.openSettings).not.toHaveBeenCalled();

    start.mockRejectedValue(new Error('ActivityNotFoundException'));
    await openAutostartSettings();
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('opens this app\'s battery saver page', async () => {
    await openBatterySettings('CoinLab');
    expect(start).toHaveBeenCalledWith('android.intent.action.MAIN', {
      packageName: 'com.miui.powerkeeper',
      className: 'com.miui.powerkeeper.ui.HiddenAppsConfigActivity',
      extra: { package_name: 'com.zenithcore.coinlab', package_label: 'CoinLab' },
    });
  });
});
