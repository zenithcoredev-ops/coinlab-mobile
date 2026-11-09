import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NeonCard } from '@/components/home/neon-card';
import { Card } from '@/components/ui';
import { theme } from '@/theme';

const seenKey = (id: string) => `coinlab_howto_seen_${id}`;

/**
 * A card that folds to its title. Open the first time it is ever shown, so a new user reads it; on
 * later visits it starts folded (the user can open it again). Tapping the title toggles it.
 */
export function CollapsibleCard({
  id,
  title,
  children,
  style,
  neon = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  style?: object;
  /** Drawn as a green neon card (the Collect / Tasks look). */
  neon?: boolean;
}) {
  // null until we know whether it was seen: drawn folded meanwhile, so nothing jumps open and shut.
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(seenKey(id))
      .then((seen) => {
        if (cancelled) return;
        setOpen(!seen);
        if (!seen) AsyncStorage.setItem(seenKey(id), '1').catch(() => {});
      })
      .catch(() => !cancelled && setOpen(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const expanded = open === true;
  const Frame = neon ? NeonCard : Card;
  return (
    <Frame style={style}>
      <Pressable
        onPress={() => setOpen(!expanded)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={8}
        style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </Frame>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  title: { flex: 1, color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md },
  body: { marginTop: theme.spacing.md, gap: theme.spacing.md },
});
