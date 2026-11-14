import { useEffect, useMemo, useState } from 'react';
import { Image, ImageSourcePropType, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { contourPaths, framedImageRect, ImageFraming, Point, ringContours } from '@/lib/home-visuals';
import { theme } from '@/theme';

/** Background looks a tab can pick. */
export type BackgroundVariant = 'neon' | 'plain';

/** [offset 0-1 down the layer, opacity] of the dark layer over a picture. */
export type ShadeStops = readonly (readonly [number, number])[];

/** An even ~65 % layer, for a picture without its own stops. */
const FLAT_SHADE: ShadeStops = [
  [0, 0.65],
  [1, 0.65],
];

/** How far the picture is taller than the layer when it slides with the list (parallax). */
const PARALLAX_EXTRA = 0.22;

/**
 * The layer behind a screen: topographic lines drawn in code (faint green) and, around `focus` (the
 * collecting ring), a few turquoise neon lines. With an `image` (see backgrounds.ts) the picture goes
 * underneath, under a dark layer graded by `shade`, and the lines stay on top, much fainter. Without
 * one the drawn background stands alone, so a missing picture changes nothing else.
 *
 * - `framing` (Collect): the picture scrolls with the content and is placed by its focal point on
 *   `focus`; where it starts below the top, it fades in from the background.
 * - `tint`: a faint green wash and less colour (the saturation filter is Android-only).
 * - `parallax`: 0-1 scroll progress; the picture, a little taller than the screen, slides up slowly
 *   so its bottom shows at the end of the list.
 */
export function ScreenBackground({
  variant = 'neon',
  focus,
  focusRadius = 100,
  image,
  shade = FLAT_SHADE,
  framing,
  tint,
  parallax,
}: {
  variant?: BackgroundVariant;
  focus?: Point | null;
  focusRadius?: number;
  image?: ImageSourcePropType | null;
  shade?: ShadeStops;
  framing?: ImageFraming;
  tint?: { opacity: number; saturation: number };
  parallax?: SharedValue<number>;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const lines = useMemo(() => (variant === 'neon' ? contourPaths(size.width, size.height) : []), [variant, size.width, size.height]);
  const neon = useMemo(() => (variant === 'neon' && focus ? ringContours(focus, focusRadius) : []), [variant, focus, focusRadius]);
  // Over a picture the drawn lines stay, much fainter.
  const lineFade = image ? 0.45 : 1;
  const framed = useMemo(() => {
    if (!image || !framing || !focus || size.width <= 0) return null;
    const asset = Image.resolveAssetSource?.(image as Parameters<typeof Image.resolveAssetSource>[0]);
    const aspect = asset?.width && asset?.height ? asset.height / asset.width : 2;
    return framedImageRect(size.width, focus.y, aspect, framing);
  }, [image, framing, focus, size.width]);

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: parallax ? -Math.min(1, Math.max(0, parallax.value)) * PARALLAX_EXTRA * size.height : 0 }],
  }));

  const imageStyle = framed
    ? { position: 'absolute' as const, left: framed.left, top: framed.top, width: framed.width, height: framed.height }
    : parallax
      ? { position: 'absolute' as const, left: 0, top: 0, width: size.width, height: size.height * (1 + PARALLAX_EXTRA) }
      : StyleSheet.absoluteFill;
  // Less colour: a view filter, which Android draws (iOS ignores saturate; the tint still applies there).
  const filter = tint && Platform.OS === 'android' ? ([{ saturate: tint.saturation }] as const) : undefined;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}>
      {image ? (
        <>
          <Animated.View testID="background-picture" style={[StyleSheet.absoluteFill, filter ? { filter } : null, slide]}>
            <Image testID="background-image" source={image} resizeMode="cover" style={imageStyle} />
          </Animated.View>
          {framed && framed.top > 0 ? (
            // The picture starts below the top: fade it in from the background.
            <EdgeFade testID="background-fade-top" top={framed.top} height={90} width={size.width} from={1} to={0} />
          ) : null}
          {framed ? (
            // It ends somewhere down the scrolling content: fade its lower edge out.
            <EdgeFade testID="background-fade" top={framed.top + framed.height * 0.7} height={framed.height * 0.3} width={size.width} from={0} to={1} />
          ) : null}
          {tint ? <View testID="background-tint" style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.neonDeep, opacity: tint.opacity }]} /> : null}
          <Svg testID="background-shade" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
                {shade.map(([offset, opacity]) => (
                  <Stop key={offset} offset={offset} stopColor={theme.colors.bgDeep} stopOpacity={opacity} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#shade)" />
          </Svg>
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

/** A band that fades the background colour in or out (`from`/`to`: its opacity at the top and bottom). */
function EdgeFade({ top, height, width, from, to, testID }: { top: number; height: number; width: number; from: number; to: number; testID: string }) {
  if (width <= 0 || height <= 0) return null;
  const id = `fade-${testID}`;
  return (
    <Svg testID={testID} width={width} height={height} style={{ position: 'absolute', left: 0, top }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.colors.bgDeep} stopOpacity={from} />
          <Stop offset="1" stopColor={theme.colors.bgDeep} stopOpacity={to} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height + 1} fill={`url(#${id})`} />
    </Svg>
  );
}

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
