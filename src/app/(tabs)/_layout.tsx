import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';

import { MiningProvider } from '@/context/mining';
import { StepsProvider } from '@/context/steps';
import { useSession } from '@/context/session';
import { useNotificationPlanner } from '@/hooks/use-notification-planner';
import { useNotificationRouting } from '@/hooks/use-notification-routing';
import { useTimezoneSync } from '@/hooks/use-timezone-sync';
import { useWidgetSync } from '@/hooks/use-widget-sync';
import { useI18n } from '@/i18n';
import { theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Rendered inside MiningProvider so it can read the streak state and mirror it to the widget.
function ReminderSync() {
  useTimezoneSync();
  useNotificationPlanner();
  useNotificationRouting();
  useWidgetSync();
  return null;
}

export default function TabsLayout() {
  const { t } = useI18n();
  const { ready, auth, onboarding } = useSession();

  if (!ready) return null;
  if (!auth) return null;
  if (onboarding === 'unknown') return null;
  if (onboarding === 'pending') return <Redirect href="/onboarding" />;

  // The active tab sits on a glowing green pill; the others are a soft grey-white.
  const icon = (name: IconName, focusedName: IconName) =>
    function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
      return (
        <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
          <Ionicons name={focused ? focusedName : name} size={size - 2} color={focused ? theme.colors.neonInk : color} />
        </View>
      );
    };

  return (
    <MiningProvider>
      <StepsProvider>
        <ReminderSync />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.neon,
            tabBarInactiveTintColor: theme.colors.tabInactive,
            tabBarStyle: { backgroundColor: theme.colors.bgDeep, borderTopColor: theme.colors.neonSoft, paddingTop: 4 },
            tabBarLabelStyle: { fontFamily: theme.fonts.rounded, fontSize: theme.fontSizes.xs, marginTop: 2 },
            sceneStyle: { backgroundColor: theme.colors.background },
          }}>
          <Tabs.Screen name="index" options={{ title: t('tabs.mine'), tabBarIcon: icon('flash-outline', 'flash') }} />
          <Tabs.Screen name="tasks" options={{ title: t('tabs.tasks'), tabBarIcon: icon('checkbox-outline', 'checkbox') }} />
          <Tabs.Screen name="league" options={{ title: t('tabs.league'), tabBarIcon: icon('trophy-outline', 'trophy') }} />
          <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('people-outline', 'people') }} />
          <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person-outline', 'person') }} />
        </Tabs>
      </StepsProvider>
    </MiningProvider>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 46, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconBoxActive: {
    backgroundColor: theme.colors.neon,
    shadowColor: theme.colors.neon,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
