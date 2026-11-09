import { useLowPowerMode } from 'expo-battery';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

/** Whether decorative motion should be off, from the parts that decide it (pure, for tests). */
export function motionAllowed(s: { focused: boolean; appActive: boolean; reduceMotion: boolean; lowPower: boolean }): boolean {
  return s.focused && s.appActive && !s.reduceMotion && !s.lowPower;
}

/**
 * Decorative animations (the scan light, the ring's sparks, the start button's breathing) run only
 * while this screen is on view, the app is in front, and neither "reduce motion" nor low-power /
 * battery-saver mode is on.
 */
export function useAmbientMotion(): boolean {
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState(false);
  const lowPower = useLowPowerMode();

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => !cancelled && setReduceMotion(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return motionAllowed({ focused, appActive, reduceMotion, lowPower: !!lowPower });
}
