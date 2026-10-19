import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';

import { MiningProvider } from '@/context/mining';
import { StepsProvider } from '@/context/steps';
import { useSession } from '@/context/session';
import { useStreakReminder } from '@/hooks/use-streak-reminder';
import { useI18n } from '@/i18n';
import { theme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Rendered inside MiningProvider so it can read the streak state.
function ReminderSync() {
  useStreakReminder();
  return null;
}

export default function TabsLayout() {
  const { t } = useI18n();
  const { ready, auth, onboarding } = useSession();

  if (!ready) return null;
  if (!auth) return <Redirect href="/" />;
  if (onboarding === 'unknown') return null;
  if (onboarding === 'pending') return <Redirect href="/onboarding" />;

  const icon = (name: IconName, focusedName: IconName) =>
    function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
      return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
    };

  return (
    <MiningProvider>
      <StepsProvider>
        <ReminderSync />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.accent,
            tabBarInactiveTintColor: theme.colors.textMuted,
            tabBarStyle: { backgroundColor: theme.colors.tabBar, borderTopColor: theme.colors.border },
            tabBarLabelStyle: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.xs },
            sceneStyle: { backgroundColor: theme.colors.background },
          }}>
          <Tabs.Screen name="index" options={{ title: t('tabs.mine'), tabBarIcon: icon('hammer-outline', 'hammer') }} />
          <Tabs.Screen name="tasks" options={{ title: t('tabs.tasks'), tabBarIcon: icon('checkbox-outline', 'checkbox') }} />
          <Tabs.Screen name="league" options={{ title: t('tabs.league'), tabBarIcon: icon('trophy-outline', 'trophy') }} />
          <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('people-outline', 'people') }} />
          <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person-outline', 'person') }} />
        </Tabs>
      </StepsProvider>
    </MiningProvider>
  );
}
