import { useRouter } from 'expo-router';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { useAppTheme } from '@/context/app-theme';

export default function Settings() {
  const router = useRouter();
  const { theme, colors, setTheme } = useAppTheme();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ayarlar</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Karanlik mod</Text>
        <Switch
          value={theme === 'dark'}
          onValueChange={(on) => setTheme(on ? 'dark' : 'light')}
          trackColor={{ true: colors.primary, false: colors.track }}
          thumbColor="#FFFFFF"
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 24 },
    header: { marginBottom: 24 },
    back: { color: c.primary, fontSize: 16, marginBottom: 12 },
    title: { color: c.text, fontSize: 28, fontWeight: 'bold' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    rowLabel: { color: c.text, fontSize: 16 },
  });
}
