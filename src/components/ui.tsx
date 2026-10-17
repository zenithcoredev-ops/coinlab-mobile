import { ReactNode } from 'react';
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
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
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
      {loading ? <ActivityIndicator color={c.text} /> : <Text style={[styles.buttonText, { color: c.text }]}>{label}</Text>}
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
