import { StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/theme';

/** A thick green neon bar with a small glint at its end. `progress` is 0..1. */
export function NeonBar({ progress, style, height = 12 }: { progress: number; style?: ViewStyle; height?: number }) {
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <View testID="progress-fill" style={[styles.fill, { width: `${p * 100}%`, borderRadius: height / 2 }]} />
      {p > 0 ? <View style={[styles.glint, { left: `${p * 100}%`, top: height / 2 - 5 }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: theme.colors.neonSoft, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.colors.neon },
  glint: {
    position: 'absolute',
    width: 10,
    height: 10,
    marginLeft: -7,
    borderRadius: 5,
    backgroundColor: theme.colors.accentLight,
    shadowColor: theme.colors.accentLight,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
