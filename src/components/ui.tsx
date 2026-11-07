import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { theme } from '@/theme';

type ButtonVariant = 'primary' | 'positive' | 'ghost' | 'danger';

const buttonColors: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
  primary: { bg: theme.colors.accent, border: theme.colors.accent, text: theme.colors.accentInk },
  positive: { bg: theme.colors.positiveSoft, border: theme.colors.positiveBorder, text: theme.colors.positive },
  ghost: { bg: theme.colors.surfaceRaised, border: theme.colors.border, text: theme.colors.text },
  danger: { bg: theme.colors.dangerSoft, border: theme.colors.danger, text: theme.colors.danger },
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  /** An icon before the label. */
  icon?: ComponentProps<typeof Ionicons>['name'];
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, icon }: ButtonProps) {
  const c = buttonColors[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: c.bg, borderColor: c.border, opacity: inactive ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={c.text} />
      ) : (
        <View style={styles.buttonRow}>
          {icon ? <Ionicons name={icon} size={18} color={c.text} /> : null}
          <Text style={[styles.buttonText, { color: c.text }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg - 2,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  buttonText: { fontFamily: theme.fonts.bodySemiBold, fontSize: theme.fontSizes.md },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md - 2,
  },
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  titleBlock: { marginBottom: theme.spacing.lg },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.xl - 2, marginBottom: 4 },
  subtitle: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    lineHeight: 19,
  },
});

/** A thick bar: green while filling, gold once complete. `progress` is 0..1. */
export function ProgressBar({ progress, style }: { progress: number; style?: ViewStyle }) {
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const done = p >= 1;
  return (
    <View
      style={[barStyles.track, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <View
        testID="progress-fill"
        style={[barStyles.fill, { width: `${p * 100}%`, backgroundColor: done ? theme.colors.progressDone : theme.colors.progressFill }]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: theme.colors.ringTrack, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
});

/** A friendly placeholder for an empty list or a not-yet-open feature: a round icon, a title and one line. */
export function EmptyState({ icon, title, body, style }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; body: string; style?: ViewStyle }) {
  return (
    <View style={[emptyStyles.box, style]}>
      <View style={emptyStyles.icon}>
        <Ionicons name={icon} size={26} color={theme.colors.accent} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.body}>{body}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: theme.spacing.xl, paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: { color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md, textAlign: 'center' },
  body: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, textAlign: 'center', lineHeight: 20 },
});

type SegmentedProps<T extends string> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <View style={segStyles.row}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[segStyles.item, selected && segStyles.itemSelected]}>
            <Text style={[segStyles.label, selected && segStyles.labelSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.radius.md,
    padding: 3,
    gap: 3,
  },
  item: { flex: 1, paddingVertical: theme.spacing.sm + 2, borderRadius: theme.radius.md - 3, alignItems: 'center' },
  itemSelected: { backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.accentBorder },
  label: { color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm },
  labelSelected: { color: theme.colors.accent },
});
