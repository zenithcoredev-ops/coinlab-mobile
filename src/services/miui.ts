import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

/** Xiaomi, Redmi and POCO phones (MIUI / HyperOS) stop background work unless the user allows it. */
export function isXiaomiDevice(): boolean {
  if (Platform.OS !== 'android') return false;
  const { Manufacturer = '', Brand = '' } = Platform.constants as { Manufacturer?: string; Brand?: string };
  return /xiaomi|redmi|poco/i.test(`${Manufacturer} ${Brand}`);
}

async function openActivity(packageName: string, className: string, extra?: Record<string, string>): Promise<boolean> {
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.MAIN', { packageName, className, extra });
    return true;
  } catch {
    return false;
  }
}

/** MIUI's "Autostart" list; the app's own settings page if this MIUI version doesn't have it. */
export async function openAutostartSettings(): Promise<void> {
  if (!(await openActivity('com.miui.securitycenter', 'com.miui.permcenter.autostart.AutoStartManagementActivity'))) {
    await Linking.openSettings();
  }
}

/** MIUI's battery saver page for this app (choose "No restrictions"); falls back to the app's settings. */
export async function openBatterySettings(appLabel: string): Promise<void> {
  const packageName = Constants.expoConfig?.android?.package ?? '';
  const opened = await openActivity('com.miui.powerkeeper', 'com.miui.powerkeeper.ui.HiddenAppsConfigActivity', {
    package_name: packageName,
    package_label: appLabel,
  });
  if (!opened) await Linking.openSettings();
}
