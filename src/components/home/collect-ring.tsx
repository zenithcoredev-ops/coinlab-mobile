import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useI18n } from '@/i18n';
import { ringGeometry, SPARK_COUNT, sparkFrame } from '@/lib/home-visuals';
import { theme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const RING_SIZE = 236;
const STROKE = 7;
const CORE = 150;

type Props = {
  /** 0..1 of the session already run. */
  progress: number;
  collecting: boolean;
  /** "0,13 Wago/saat", shown under "Toplanıyor". */
  rate: string;
  /** Spinner instead of the label (starting, or no status yet). */
  busy: boolean;
  /** The start button can't be pressed (collecting, starting, or no status yet). */
  disabled: boolean;
  onStart: () => void;
  /** Decorative motion (sparks, breathing) may run. */
  animate: boolean;
};

/**
 * The collecting ring: a green neon arc for the session's progress with a gold light at its tip and
 * a few short-lived gold sparks trailing only behind that light. Inside, while collecting: a bolt,
 * "Toplanıyor" and the speed; otherwise a filled green "Toplamayı başlat" that breathes gently.
 */
export function CollectRing({ progress, collecting, rate, busy, disabled, onStart, animate }: Props) {
  const { t } = useI18n();
  const g = ringGeometry(RING_SIZE, STROKE, collecting ? progress : 0);
  const showTip = collecting && progress > 0;

  const clock = useSharedValue(0);
  const tipAngle = useSharedValue(g.tipAngle);
  useEffect(() => {
    tipAngle.value = g.tipAngle;
  }, [g.tipAngle, tipAngle]);

  const sparks = animate && showTip;
  useEffect(() => {
    if (!sparks) {
      cancelAnimation(clock);
      return;
    }
    clock.value = 0;
    clock.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [sparks, clock]);

  // The start button breathes: a slow, small swell.
  const breath = useSharedValue(0);
  const breathing = animate && !collecting && !busy && !disabled;
  useEffect(() => {
    if (!breathing) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(breath);
  }, [breathing, breath]);
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.04 }], opacity: 0.92 + breath.value * 0.08 }));

  return (
    <View style={styles.box} testID="collect-ring">
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={g.center} cy={g.center} r={g.r} stroke={theme.colors.neon} strokeOpacity={0.12} strokeWidth={STROKE} fill="none" />
        {collecting ? (
          <>
            <Circle
              cx={g.center}
              cy={g.center}
              r={g.r}
              stroke={theme.colors.neon}
              strokeOpacity={0.18}
              strokeWidth={STROKE + 10}
              strokeDasharray={`${g.circumference} ${g.circumference}`}
              strokeDashoffset={g.dashOffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${g.center} ${g.center})`}
            />
            <Circle
              testID="ring-progress"
              cx={g.center}
              cy={g.center}
              r={g.r}
              stroke={theme.colors.neon}
              strokeWidth={STROKE}
              strokeDasharray={`${g.circumference} ${g.circumference}`}
              strokeDashoffset={g.dashOffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${g.center} ${g.center})`}
            />
          </>
        ) : null}
        {sparks ? Array.from({ length: SPARK_COUNT }, (_, i) => <Spark key={i} index={i} clock={clock} tipAngle={tipAngle} r={g.r} center={g.center} />) : null}
        {showTip ? (
          <>
            <Circle cx={g.tip.x} cy={g.tip.y} r={11} fill={theme.colors.accent} fillOpacity={0.22} />
            <Circle testID="ring-tip" cx={g.tip.x} cy={g.tip.y} r={5} fill={theme.colors.accentLight} />
          </>
        ) : null}
      </Svg>

      {collecting ? (
        <View style={[styles.core, styles.coreActive]} accessible accessibilityLabel={`${t('mine.active')}, ${rate}`}>
          <View style={styles.bolt}>
            <Ionicons name="flash" size={22} color={theme.colors.neonInk} />
          </View>
          <Text style={styles.activeLabel}>{t('mine.active')}</Text>
          <Text style={styles.rate}>{rate}</Text>
        </View>
      ) : (
        <Animated.View style={breathStyle}>
          <Pressable
            onPress={onStart}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t('mine.start')}
            style={({ pressed }) => [styles.core, styles.coreIdle, pressed && { opacity: 0.85 }]}>
            {busy ? (
              <ActivityIndicator color={theme.colors.neonInk} />
            ) : (
              <>
                <Ionicons name="flash" size={30} color={theme.colors.neonInk} />
                <Text style={styles.startLabel}>{t('mine.startLabel')}</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function Spark({ index, clock, tipAngle, r, center }: { index: number; clock: SharedValue<number>; tipAngle: SharedValue<number>; r: number; center: number }) {
  const props = useAnimatedProps(() => {
    const f = sparkFrame(index, clock.value, tipAngle.value, r, center);
    return { cx: f.x, cy: f.y, r: f.size, opacity: f.opacity };
  });
  return <AnimatedCircle animatedProps={props} fill={theme.colors.accentLight} />;
}

const styles = StyleSheet.create({
  box: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  core: { width: CORE, height: CORE, borderRadius: CORE / 2, alignItems: 'center', justifyContent: 'center', gap: 4, padding: theme.spacing.sm },
  coreActive: { borderWidth: 2, borderColor: theme.colors.neon, backgroundColor: theme.colors.glass },
  coreIdle: { backgroundColor: theme.colors.neon },
  bolt: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeLabel: { color: theme.colors.text, fontFamily: theme.fonts.displayMedium, fontSize: theme.fontSizes.md + 1 },
  rate: { color: theme.colors.neon, fontFamily: theme.fonts.rounded, fontSize: theme.fontSizes.sm },
  startLabel: { color: theme.colors.neonInk, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md - 1, textAlign: 'center', lineHeight: 18 },
});
