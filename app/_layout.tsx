import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { LoadingState } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <View style={styles.setup}>
        <Text style={styles.setupTitle}>Setup needed</Text>
        <Text style={styles.setupText}>
          Create a .env file (copy .env.example) with EXPO_PUBLIC_SUPABASE_URL and
          EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart with `npx expo start -c`.
        </Text>
      </View>
    );
  }
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </AuthProvider>
  );
}

/**
 * Route protection. Signed-out users can only reach login/register;
 * signed-in users can only reach the app. Staff-only routes are guarded again
 * by role, and by the database (RLS) as the final authority.
 */
function RootNavigator() {
  const { session, isStaff, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' }}>
        <LoadingState label="Restoring your session..." />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && isStaff}>
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="event/form" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  setup: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: COLORS.ink },
  setupTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 10 },
  setupText: { fontSize: 15, color: COLORS.onInkMuted, lineHeight: 22 },
});
