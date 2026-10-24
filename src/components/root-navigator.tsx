import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/context/session';
import { theme } from '@/theme';

/**
 * The root stack. Signed-in-only screens are guarded here, so when the session ends the
 * router itself drops them and falls back to the sign-in screen; no screen renders a
 * `<Redirect href="/">` for that. (That was the old way out, and "/" matches both
 * `app/index` and `app/(tabs)/index`, so it could resolve back into (tabs), re-render its
 * own layout and redirect again, forever.)
 */
export function RootNavigator() {
  const router = useRouter();
  const { auth } = useSession();
  const signedIn = !!auth;

  // Entering the app happens once per sign-in. This effect sits above the Stack, so it runs
  // after the guard has opened (a Redirect inside the sign-in screen would run before it).
  useEffect(() => {
    if (signedIn) router.replace('/(tabs)');
  }, [signedIn, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}
