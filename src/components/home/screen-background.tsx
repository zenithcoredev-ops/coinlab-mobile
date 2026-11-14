import { useEffect, useMemo, useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { contourPaths, framedImageRect, ImageFraming, Point, ringContours } from '@/lib/home-visuals';
import { theme } from '@/theme';

/** Background looks a tab can pick. */
export type BackgroundVariant = 'neon' | 'plain';

/**
 * The layer behind a screen: topographic lines drawn in code (faint green) and, around `focus` (the
 * collecting ring), a few turquoise neon lines. With an `image` (see backgrounds.ts), the picture
 * fills the layer under a ~65 % dark green-black shade and the lines get fainter still; without one
 * the drawn background stands alone, so a missing picture changes nothing else.
 */
export function ScreenBackground({
  variant = 'neon',
  focus,
  focusRadius = 100,
  image,
  shade = 'flat',
  framing,
}: {
  variant?: BackgroundVariant;
  focus?: Point | null;
  focusRadius?: number;
  image?: ImageSourcePropType | null;
  /**
   * Over a picture: an even ~65 % shade; 'graded', darker at the top and bottom; or 'topReveal',
   * lighter in the top third (the picture shows faintly there) and darker below.
   */
  shade?: 'flat' | 'graded' | 'topReveal' | 'centerLight';
  /**
   * Place the picture by its focal point instead of covering: zoomed by `scale` and shifted so the
   * point at `anchorY` lands on `focus` (the Collect screen's peak on the ring). Needs `focus`.
   */
  framing?: ImageFraming;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const lines = useMemo(() => (variant === 'neon' ? contourPaths(size.width, size.height) : []), [variant, size.width, size.height]);
  const neon = useMemo(() => (variant === 'neon' && focus ? ringContours(focus, focusRadius) : []), [variant, focus, focusRadius]);
  // Over a picture the drawn lines stay, much fainter.
  const lineFade = image ? 0.45 : 1;
  const framed = useMemo(() => {
    if (!image || !framing || !focus || size.width <= 0) return null;
    const asset = Image.resolveAssetSource?.(image as Parameters<typeof Image.resolveAssetSource>[0]);
    const aspect = asset?.width && asset?.height ? asset.height / asset.width : 1.6;
    return framedImageRect(size.width, focus.y, aspect, framing);
  }, [image, framing, focus, size.width]);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}>
      {image ? (
        <>
          <Image
            testID="background-image"
            source={image}
            resizeMode="cover"
            style={framed ? { position: 'absolute', left: framed.left, top: framed.top, width: framed.width, height: framed.height } : StyleSheet.absoluteFill}
          />
          {framed ? (
            // The picture ends somewhere down the scrolling content: fade its lower edge into the background.
            <Svg
              testID="background-fade"
              width={size.width}
              height={framed.height * 0.3}
              style={{ position: 'absolute', left: 0, top: framed.top + framed.height * 0.7 }}>
              <Defs>
                <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.colors.bgDeep} stopOpacity={0} />
                  <Stop offset="1" stopColor={theme.colors.bgDeep} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={size.width} height={framed.height * 0.3 + 1} fill="url(#fade)" />
            </Svg>
          ) : null}
          {shade !== 'flat' ? (
            <Svg testID="background-shade" width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
                  {SHADE_STOPS[shade].map(([offset, opacity]) => (
                    <Stop key={offset} offset={offset} stopColor={theme.colors.bgDeep} stopOpacity={opacity} />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width="100%" height="100%" fill="url(#shade)" />
            </Svg>
          ) : (
            <View testID="background-shade" style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.imageShade }]} />
          )}
        </>
      ) : null}
      {size.width > 0 && variant === 'neon' ? (
        <Svg width={size.width} height={size.height}>
          {lines.map((d, i) => (
            <Path key={`c${i}`} d={d} stroke={image ? theme.colors.contourFaint : theme.colors.contour} strokeWidth={1} fill="none" />
          ))}
          {neon.map((d, i) => (
            // A soft wide stroke under a thin bright one: a neon line without blur filters.
            <Path key={`g${i}`} d={d} stroke={theme.colors.turquoise} strokeOpacity={0.12 * lineFade} strokeWidth={5} fill="none" />
          ))}
          {neon.map((d, i) => (
            <Path key={`n${i}`} d={d} stroke={theme.colors.turquoise} strokeOpacity={(0.45 - i * 0.1) * lineFade} strokeWidth={1.2} fill="none" />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

/** [offset, opacity] of the dark layer over a picture, top to bottom. */
const GRADED_STOPS: [number, number][] = [
  [0, 0.88],
  [0.3, 0.6],
  [0.7, 0.6],
  [1, 0.9],
];
const TOP_REVEAL_STOPS: [number, number][] = [
  [0, 0.45],
  [0.3, 0.55],
  [0.5, 0.82],
  [1, 0.9],
];
/** Collect: light (~45 %) through the middle, a little darker at the top and bottom. */
const CENTER_LIGHT_STOPS: [number, number][] = [
  [0, 0.62],
  [0.3, 0.45],
  [0.7, 0.45],
  [1, 0.65],
];
const SHADE_STOPS: Record<'graded' | 'topReveal' | 'centerLight', [number, number][]> = {
  graded: GRADED_STOPS,
  topReveal: TOP_REVEAL_STOPS,
  centerLight: CENTER_LIGHT_STOPS,
};

const SCAN_TRAVEL_MS = 6000;
const SCAN_PAUSE_MS = 3000; // a pass every 9 s
const SCAN_BAND = 140;

/**
 * A turquoise light that sweeps slowly down the screen every 9 s. Sits over the whole screen, never
 * catches touches, and stops (hidden) while `animate` is off.
 */
export function ScanLight({ animate, faint = false }: { animate: boolean; faint?: boolean }) {
  // Over a picture it stays, much fainter.
  const k = faint ? 0.45 : 1;
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
            <Stop offset="0.5" stopColor={theme.colors.turquoise} stopOpacity={0.14 * k} />
            <Stop offset="1" stopColor={theme.colors.turquoise} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={SCAN_BAND} fill="url(#scan)" />
        <Rect testID="scan-line" x={0} y={SCAN_BAND / 2 - 0.75} width={width} height={1.5} fill={theme.colors.turquoise} opacity={0.5 * k} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scan: { position: 'absolute', left: 0, top: 0 },
});
