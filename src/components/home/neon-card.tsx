import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { theme } from '@/theme';

export type NeonTone = 'green' | 'gold';

const RADIUS = 18;
const GRID = 18;

/**
 * A glass card with a neon edge (green, or gold for rewards), corner brackets and, optionally, a
 * faint grid inside. The glow is drawn as soft wide strokes, so it looks the same on Android, where
 * coloured shadows don't exist.
 */
export function NeonCard({
  tone = 'green',
  grid = false,
  onPress,
  accessibilityLabel,
  style,
  children,
  testID,
  glow = 'soft',
}: {
  tone?: NeonTone;
  /** How bright the neon edge is: 'strong' for the Tasks tab's brighter cards. */
  glow?: 'soft' | 'strong';
  grid?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children: ReactNode;
  testID?: string;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const color = tone === 'gold' ? theme.colors.accent : theme.colors.neon;
  const { width: w, height: h } = size;
  const strong = glow === 'strong';

  const frame =
    w > 0 ? (
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        {grid
          ? [
              ...Array.from({ length: Math.floor(w / GRID) }, (_, i) => (
                <Line key={`v${i}`} x1={(i + 1) * GRID} y1={4} x2={(i + 1) * GRID} y2={h - 4} stroke={color} strokeOpacity={0.06} strokeWidth={1} />
              )),
              ...Array.from({ length: Math.floor(h / GRID) }, (_, i) => (
                <Line key={`h${i}`} x1={4} y1={(i + 1) * GRID} x2={w - 4} y2={(i + 1) * GRID} stroke={color} strokeOpacity={0.06} strokeWidth={1} />
              )),
            ]
          : null}
        {strong ? <Rect x={5} y={5} width={w - 10} height={h - 10} rx={RADIUS - 3} fill="none" stroke={color} strokeOpacity={0.1} strokeWidth={10} /> : null}
        <Rect x={2} y={2} width={w - 4} height={h - 4} rx={RADIUS} fill="none" stroke={color} strokeOpacity={strong ? 0.3 : 0.12} strokeWidth={4} />
        <Rect x={1} y={1} width={w - 2} height={h - 2} rx={RADIUS} fill="none" stroke={color} strokeOpacity={strong ? 1 : 0.85} strokeWidth={strong ? 1.6 : 1.2} />
        {brackets(w, h).map((d, i) => (
          <Path key={`b${i}`} d={d} stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
    ) : null;

  const content = (
    <>
      {frame}
      {children}
    </>
  );
  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) =>
    setSize({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) });

  return onPress ? (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, strong && halo(color), style, pressed && { opacity: 0.85 }]}>
      {content}
    </Pressable>
  ) : (
    <View testID={testID} onLayout={onLayout} style={[styles.card, strong && halo(color), style]}>
      {content}
    </View>
  );
}

/** A soft coloured halo outside the card where the platform draws one (iOS); Android keeps the inner glow. */
// iOS clips a shadow on a view that clips its content, so this card doesn't clip (its frame fits inside anyway).
const halo = (color: string): ViewStyle => ({ overflow: 'visible', shadowColor: color, shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } });

/** L-shaped marks just inside each corner. */
function brackets(w: number, h: number): string[] {
  const i = 9; // inset
  const l = 16; // arm length
  return [
    `M${i} ${i + l} L${i} ${i} L${i + l} ${i}`,
    `M${w - i - l} ${i} L${w - i} ${i} L${w - i} ${i + l}`,
    `M${i} ${h - i - l} L${i} ${h - i} L${i + l} ${h - i}`,
    `M${w - i - l} ${h - i} L${w - i} ${h - i} L${w - i} ${h - i - l}`,
  ];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.glass,
    borderRadius: RADIUS,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg + 2,
    overflow: 'hidden',
  },
});
