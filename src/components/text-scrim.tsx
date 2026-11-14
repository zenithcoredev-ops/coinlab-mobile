import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/theme';

/**
 * A soft dark backing for text that sits outside the cards, on top of a background picture (a status
 * line, an error, a section label). Dark enough (theme.colors.scrim) that every text colour stays at
 * WCAG AA over any picture, so it doesn't depend on what the picture shows there.
 */
export function TextScrim({ children, style, testID }: { children: ReactNode; style?: ViewStyle; testID?: string }) {
  return (
    <View testID={testID} style={[styles.scrim, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: theme.colors.scrim,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm - 2,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'center',
    alignItems: 'center',
  },
});
