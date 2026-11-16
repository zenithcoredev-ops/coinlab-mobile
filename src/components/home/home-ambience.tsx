import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { cancelAnimation, Easing, SharedValue, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';

import {
  FLAG,
  flagPulse,
  LOOP_S,
  onScreen,
  pathLight,
  pathOnScreen,
  Rect,
  STAR_GROUP_PERIODS_S,
  starField,
  twinkle,
} from '@/lib/home-ambience';
import { theme } from '@/theme';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FLAG_HALO_R = 26;
/** Stars keep this far (dp) outside the collecting ring, clear of its sparks. */
export const RING_CLEARANCE = 18;

/**
 * Quiet life over the Collect picture, drawn in code on top of it: a few stars twinkling in the sky,
 * a soft green light climbing the neon path from the tents every 7.5 s (fading out before the
 * collecting ring), and a faint pulse around the gold flag. All slow and dim, and all driven by one
 * clock: stars twinkle in six groups, so the whole layer is nine animated shapes. Nothing is drawn
 * while `animate` is off (screen hidden, app in the background, reduce motion, battery saver).
 */
export function HomeAmbience({
  rect,
  ring,
  animate,
}: {
  /** Where the picture is drawn in the layer (from its framing). */
  rect: Rect;
  /** The collecting ring's centre and radius in the layer; the path light fades out before it. */
  ring: { x: number; y: number; radius: number } | null;
  animate: boolean;
}) {
  const clock = useSharedValue(0);
  useEffect(() => {
    if (!animate) {
      cancelAnimation(clock);
      return;
    }
    clock.value = 0;
    clock.value = withRepeat(withTiming(LOOP_S, { duration: LOOP_S * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [animate, clock]);

  // Stars near the ring would mix with its sparks: those are left out.
  const stars = useMemo(
    () =>
      starField().filter((s) => {
        if (!ring) return true;
        const p = onScreen(s, rect);
        return Math.hypot(p.x - ring.x, p.y - ring.y) > ring.radius + RING_CLEARANCE;
      }),
    [rect, ring]
  );
  const path = useMemo(() => pathOnScreen(rect), [rect]);
  const flag = onScreen(FLAG, rect);
  if (!animate) return null;

  const width = rect.left * 2 + rect.width;
  const height = rect.top + rect.height;
  return (
    <Svg testID="home-ambience" pointerEvents="none" width={width} height={height} style={styles.layer}>
      <Defs>
        <RadialGradient id="ambience-light" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={theme.colors.neon} stopOpacity={0.9} />
          <Stop offset="1" stopColor={theme.colors.neon} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="ambience-flag" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={theme.colors.accentLight} stopOpacity={0.8} />
          <Stop offset="1" stopColor={theme.colors.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {STAR_GROUP_PERIODS_S.map((period, group) => (
        <StarGroup key={group} clock={clock} period={period} phase={(group * 0.37) % 1}>
          {stars
            .filter((s) => s.group === group)
            .map((s, i) => {
              const p = onScreen(s, rect);
              return <Circle key={i} testID="ambience-star" cx={p.x} cy={p.y} r={s.r} fill="#EAF6FF" />;
            })}
        </StarGroup>
      ))}
      <PathLight clock={clock} xs={path.xs} ys={path.ys} along={path.along} ring={ring} />
      <FlagGlow clock={clock} x={flag.x} y={flag.y} />
    </Svg>
  );
}

function StarGroup({ clock, period, phase, children }: { clock: SharedValue<number>; period: number; phase: number; children: React.ReactNode }) {
  const props = useAnimatedProps(() => ({ opacity: twinkle(clock.value, period, phase) }));
  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}

function PathLight({
  clock,
  xs,
  ys,
  along,
  ring,
}: {
  clock: SharedValue<number>;
  xs: number[];
  ys: number[];
  along: number[];
  ring: { x: number; y: number; radius: number } | null;
}) {
  const halo = useAnimatedProps(() => {
    const l = pathLight(clock.value, xs, ys, along, ring);
    return { cx: l.x, cy: l.y, opacity: l.opacity };
  });
  const core = useAnimatedProps(() => {
    const l = pathLight(clock.value, xs, ys, along, ring);
    return { cx: l.x, cy: l.y, opacity: Math.min(1, l.opacity * 1.6) };
  });
  return (
    <>
      <AnimatedCircle testID="ambience-path-light" animatedProps={halo} r={9} fill="url(#ambience-light)" />
      <AnimatedCircle animatedProps={core} r={2.2} fill="#C8FFD9" />
    </>
  );
}

function FlagGlow({ clock, x, y }: { clock: SharedValue<number>; x: number; y: number }) {
  const props = useAnimatedProps(() => {
    const p = flagPulse(clock.value);
    return { r: FLAG_HALO_R * p.scale, opacity: p.opacity };
  });
  return <AnimatedCircle testID="ambience-flag" animatedProps={props} cx={x} cy={y} fill="url(#ambience-flag)" />;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
});
