import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { NeonCard } from '@/components/neon-card';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { requestApproxLocationPermission } from '@/services/location';
import { isXiaomiDevice, openAutostartSettings, openBatterySettings } from '@/services/miui';
import { theme } from '@/theme';
import { refreshWidgets } from '@/widget/refresh';
import { isWeatherEnabled, setWeatherEnabled } from '@/widget/weather';
import { refreshWeatherInApp } from '@/widget/weather-sync';

/**
 * Profile's widget card: "Weather on the widget" (off by default; asks for approximate location) and,
 * on Xiaomi phones, how to keep the widget updating. The data credit sits at the foot of the Profile tab.
 */
export function WidgetWeatherSetting() {
  const { t } = useI18n();
  const [on, setOn] = useState(false);

  useEffect(() => {
    isWeatherEnabled().then(setOn).catch(() => {});
  }, []);

  async function onToggle(next: boolean) {
    if (!next) {
      setOn(false);
      await setWeatherEnabled(false);
      await refreshWidgets();
      return;
    }
    if (!(await requestApproxLocationPermission())) {
      Alert.alert(t('profile.weather.deniedTitle'), t('profile.weather.deniedBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.notif.openSettings'), onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    setOn(true);
    await setWeatherEnabled(true);
    await refreshWeatherInApp().catch(() => false);
    await refreshWidgets();
  }

  // The home-screen widget exists on Android only.
  if (Platform.OS !== 'android') return null;
  return (
    <>
      <NeonCard style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.widget')}</Text>
        <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.title}>{t('profile.weather.title')}</Text>
          <Text style={styles.hint}>{t('profile.weather.hint')}</Text>
        </View>
        <Switch
          value={on}
          onValueChange={onToggle}
          trackColor={{ true: theme.colors.neon, false: theme.colors.ringTrack }}
          thumbColor={theme.colors.text}
        />
        </View>
        {isXiaomiDevice() && (
          <View style={styles.miui}>
            <Text style={styles.title}>{t('profile.miui.title')}</Text>
            <Text style={styles.hint}>{t('profile.miui.body')}</Text>
            <View style={styles.buttons}>
              <Button label={t('profile.miui.autostart')} onPress={openAutostartSettings} variant="ghost" style={styles.button} />
              <Button label={t('profile.miui.battery')} onPress={() => openBatterySettings(t('app.name'))} variant="ghost" style={styles.button} />
            </View>
          </View>
        )}
      </NeonCard>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.lg },
  cardTitle: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg - 1, marginBottom: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  text: { flex: 1 },
  title: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 0.5 },
  hint: { color: theme.colors.tabInactive, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 2 },
  miui: { marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.ringTrack },
  buttons: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  button: { flex: 1 },
});
