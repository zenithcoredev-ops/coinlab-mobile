import { memo, ReactNode, useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { bracketPaths, edgeRects, haloRects, NEON_CARD } from '@/lib/neon-frame';
import { theme } from '@/theme';

export type NeonTone = 'green' | 'gold';

/**
 * The shared neon card: glass inside, a bright neon edge (green, or gold for rewards) with a soft
 * halo around it, corner brackets and, optionally, a faint grid. All of it comes from NEON_CARD, so
 * every screen's cards look alike. The halo is drawn (see lib/neon-frame), so Android shows it too.
 */
export function NeonCard({
  tone = 'green',
  grid = false,
  onPress,
  accessibilityLabel,
  style,
  children,
  testID,
}: {
  tone?: NeonTone;
  grid?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children: ReactNode;
  testID?: string;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const color = tone === 'gold' ? theme.colors.accent : theme.colors.neon;
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width);
    const height = Math.round(e.nativeEvent.layout.height);
    setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
  }, []);

  const content = (
    <>
      {size.width > 0 ? <NeonFrame width={size.width} height={size.height} color={color} grid={grid} /> : null}
      {children}
    </>
  );

  return onPress ? (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}>
      {content}
    </Pressable>
  ) : (
    <View testID={testID} onLayout={onLayout} style={[styles.card, style]}>
      {content}
    </View>
  );
}

/**
 * The card's static frame: halo, inner glow, edge, brackets and grid. Redrawn only when the card's
 * size or colour changes (not on presses or content updates), and kept as a bitmap while the list
 * scrolls, so scrolling doesn't redraw the strokes.
 */
const NeonFrame = memo(function NeonFrame({ width: w, height: h, color, grid }: { width: number; height: number; color: string; grid: boolean }) {
  const o = NEON_CARD.halo;
  const g = NEON_CARD.grid;
  return (
    <View
      testID="neon-frame"
      pointerEvents="none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[styles.frame, { left: -o, top: -o, width: w + 2 * o, height: h + 2 * o }]}>
      <Svg width={w + 2 * o} height={h + 2 * o}>
        {haloRects(w, h).map((r, i) => (
          <Rect key={`h${i}`} testID="neon-halo" {...rect(r)} stroke={color} strokeOpacity={r.opacity} fill="none" />
        ))}
        {grid
          ? [
              ...Array.from({ length: Math.floor(w / g.step) }, (_, i) => (
                <Line key={`v${i}`} x1={o + (i + 1) * g.step} y1={o + 4} x2={o + (i + 1) * g.step} y2={o + h - 4} stroke={color} strokeOpacity={g.opacity} strokeWidth={1} />
              )),
              ...Array.from({ length: Math.floor(h / g.step) }, (_, i) => (
                <Line key={`g${i}`} x1={o + 4} y1={o + (i + 1) * g.step} x2={o + w - 4} y2={o + (i + 1) * g.step} stroke={color} strokeOpacity={g.opacity} strokeWidth={1} />
              )),
            ]
          : null}
        {edgeRects(w, h).map((r, i) => (
          <Rect key={`e${i}`} {...rect(r)} stroke={color} strokeOpacity={r.opacity} fill="none" />
        ))}
        {bracketPaths(w, h).map((d, i) => (
          <Path key={`b${i}`} d={d} stroke={color} strokeWidth={NEON_CARD.bracket.width} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
    </View>
  );
});

const rect = (r: { x: number; y: number; width: number; height: number; rx: number; strokeWidth: number }) => ({
  x: r.x,
  y: r.y,
  width: r.width,
  height: r.height,
  rx: r.rx,
  strokeWidth: r.strokeWidth,
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.glass,
    borderRadius: NEON_CARD.radius,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg + 2,
    // The halo is drawn just outside the card, so the card mustn't clip.
    overflow: 'visible',
  },
  frame: { position: 'absolute' },
});
