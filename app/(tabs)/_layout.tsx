import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color} />
  );
}

/** Tabs are shown per role. (Each hidden screen also re-checks the role itself.) */
export default function TabLayout() {
  const { role } = useAuth();
  const student = role === 'student';
  const staff = role !== 'student';
  const admin = role === 'admin';
  const show = (visible: boolean) => ({ href: visible ? undefined : null });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: icon('qr-code', 'qr-code-outline'), ...show(student) }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('time', 'time-outline'), ...show(student) }} />
      <Tabs.Screen name="records" options={{ title: 'Records', tabBarIcon: icon('stats-chart', 'stats-chart-outline'), ...show(staff) }} />
      <Tabs.Screen name="admin" options={{ title: 'Admin', tabBarIcon: icon('shield-checkmark', 'shield-checkmark-outline'), ...show(admin) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
