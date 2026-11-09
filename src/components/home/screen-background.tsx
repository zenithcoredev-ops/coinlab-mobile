import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { contourPaths, Point, ringContours } from '@/lib/home-visuals';
import { theme } from '@/theme';

/** Background looks a tab can pick. Only the Collect tab uses the neon one for now. */
export type BackgroundVariant = 'neon' | 'plain';

/**
 * The layer behind a screen's scrolling content: topographic lines drawn in code (faint green) and,
 * around `focus` (the collecting ring), a few turquoise neon lines. Sized to the content, so it
 * scrolls with it and the lines stay around the ring.
 */
export function ScreenBackground({
  variant = 'neon',
  focus,
  focusRadius = 100,
}: {
  variant?: BackgroundVariant;
  focus?: Point | null;
  focusRadius?: number;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const lines = useMemo(() => (variant === 'neon' ? contourPaths(size.width, size.height) : []), [variant, size.width, size.height]);
  const neon = useMemo(() => (variant === 'neon' && focus ? ringContours(focus, focusRadius) : []), [variant, focus, focusRadius]);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}>
      {size.width > 0 && variant === 'neon' ? (
        <Svg width={size.width} height={size.height}>
          {lines.map((d, i) => (
            <Path key={`c${i}`} d={d} stroke={theme.colors.contour} strokeWidth={1} fill="none" />
          ))}
          {neon.map((d, i) => (
            // A soft wide stroke under a thin bright one: a neon line without blur filters.
            <Path key={`g${i}`} d={d} stroke={theme.colors.turquoise} strokeOpacity={0.12} strokeWidth={5} fill="none" />
          ))}
          {neon.map((d, i) => (
            <Path key={`n${i}`} d={d} stroke={theme.colors.turquoise} strokeOpacity={0.45 - i * 0.1} strokeWidth={1.2} fill="none" />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const SCAN_TRAVEL_MS = 6000;
const SCAN_PAUSE_MS = 3000; // a pass every 9 s
const SCAN_BAND = 140;

/**
 * A turquoise light that sweeps slowly down the screen every 9 s. Sits over the whole screen, never
 * catches touches, and stops (hidden) while `animate` is off.
 */
export function ScanLight({ animate }: { animate: boolean }) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withSequence(withTiming(1, { duration: SCAN_TRAVEL_MS, easing: Easing.inOut(Easing.quad) }), withDelay(SCAN_PAUSE_MS, withTiming(0, { duration: 0 }))),
      -1
    );
    return () => cancelAnimation(progress);
  }, [animate, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value > 0 && progress.value < 1 ? 1 : 0,
    transform: [{ translateY: -SCAN_BAND + progress.value * (height + SCAN_BAND) }],
  }));

  if (!animate) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.scan, { width, height: SCAN_BAND }, style]}>
      <Svg width={width} height={SCAN_BAND}>
        <Defs>
          <LinearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.turquoise} stopOpacity={0} />
            <Stop offset="0.5" stopColor={theme.colors.turquoise} stopOpacity={0.14} />
            <Stop offset="1" stopColor={theme.colors.turquoise} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={SCAN_BAND} fill="url(#scan)" />
        <Rect x={0} y={SCAN_BAND / 2 - 0.75} width={width} height={1.5} fill={theme.colors.turquoise} opacity={0.5} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scan: { position: 'absolute', left: 0, top: 0 },
});
