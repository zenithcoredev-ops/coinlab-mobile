import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, SectionLabel } from '@/components/ui';
import { useI18n } from '@/i18n';
import { requestApproxLocationPermission } from '@/services/location';
import { theme } from '@/theme';
import { refreshWidgets } from '@/widget/refresh';
import { isWeatherEnabled, setWeatherEnabled } from '@/widget/weather';
import { refreshWeatherInApp } from '@/widget/weather-sync';

/** Profile: "Weather on the widget" (off by default; asks for approximate location) and the data credit. */
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
      <SectionLabel>{t('profile.widget')}</SectionLabel>
      <Card style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.title}>{t('profile.weather.title')}</Text>
          <Text style={styles.hint}>{t('profile.weather.hint')}</Text>
        </View>
        <Switch
          value={on}
          onValueChange={onToggle}
          trackColor={{ true: theme.colors.accent, false: theme.colors.ringTrack }}
          thumbColor={theme.colors.text}
        />
      </Card>
      <Text style={styles.credit}>{t('profile.weather.attribution')}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  text: { flex: 1 },
  title: { color: theme.colors.text, fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md - 0.5 },
  hint: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs + 0.5, marginTop: 2 },
  credit: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
});
