import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { getWidgetInfo } from 'react-native-android-widget';

import { Button, Card, SectionLabel } from '@/components/ui';
import { theme } from '@/theme';
import { WIDGET_NAMES } from '@/widget/widget-task-handler';

/** Set in eas.json for the preview profile only (inlined at build time), so store builds never show this. */
const diagnosticsOn = () => process.env.EXPO_PUBLIC_WIDGET_DIAGNOSTICS === '1';

type Report = { name: string; lines: string[] };

/**
 * Profile, preview builds only: what the launcher reports about each placed widget's size (min/max,
 * Android 12+ size list, the size actually drawn, screen, density), to compare with what is visible.
 * Not translated: it's for us, not for users.
 */
export function WidgetDiagnostics() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await Promise.all(
        WIDGET_NAMES.map(async (name) => {
          const widgets = (await getWidgetInfo(name)) as ({ sizeReport?: string; width: number; height: number } & object)[];
          return {
            name,
            lines: widgets.length
              ? widgets.map((w) => w.sizeReport ?? `drawn=${w.width}x${w.height} (no report: old build)`)
              : ['not on the home screen'],
          };
        })
      );
      setReports(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  if (!diagnosticsOn() || Platform.OS !== 'android') return null;
  return (
    <>
      <SectionLabel>Widget tanılama</SectionLabel>
      <Card>
        <Button label={reports ? 'Yenile' : 'Boyutları göster'} onPress={load} variant="ghost" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {reports?.map((r) => (
          <Text key={r.name} style={styles.report} selectable>
            {r.name}
            {'\n'}
            {r.lines.join('\n')}
          </Text>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  report: { color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.md },
  error: { color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.xs, marginTop: theme.spacing.sm },
});
