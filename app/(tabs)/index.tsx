import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import EventCard from '@/components/EventCard';
import Screen from '@/components/Screen';
import { Card, EmptyState, ErrorState, LoadingState, SectionTitle, StatTile } from '@/components/ui';
import { COLORS } from '@/constants/colors';
import { getMyAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { listEvents } from '@/lib/events';
import { formatDateTime, greeting, isAcceptingAttendance } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';

export default function HomeScreen() {
  const { profile, user, role, isStaff } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const q = useQuery(async () => {
    if (!user) return null;
    if (role === 'student') {
      const [events, mine] = await Promise.all([listEvents(), getMyAttendance(user.id)]);
      return { events, mine };
    }
    const events = await listEvents(role === 'teacher' ? { ownerId: user.id } : {});
    return { events, mine: [] };
  }, [user?.id, role]);

  const events = q.data?.events ?? [];
  const mine = q.data?.mine ?? [];
  const available = events.filter(isAcceptingAttendance);

  const studentStats = (
    <View style={styles.stats}>
      <StatTile label="Attended" value={mine.length} icon="checkmark-done" tone="#5EE0B0" />
      <StatTile label="On time" value={mine.filter((m) => m.status === 'present').length} icon="time" tone="#7FB0FF" />
      <StatTile label="Late" value={mine.filter((m) => m.status === 'late').length} icon="alert-circle" tone="#FFC46B" />
    </View>
  );
  const staffStats = (
    <View style={styles.stats}>
      <StatTile label="Events" value={events.length} icon="calendar" tone="#7FB0FF" />
      <StatTile label="Open now" value={available.length} icon="radio" tone="#5EE0B0" />
      <StatTile label="Check-ins" value={events.reduce((n, e) => n + (e.attendance?.[0]?.count ?? 0), 0)} icon="people" tone="#FFC46B" />
    </View>
  );

  return (
    <Screen
      title={`${greeting()}, ${firstName}`}
      subtitle={role === 'student' ? 'Scan the QR at your event to check in.' : role === 'admin' ? 'System overview' : 'Your events at a glance'}
      headerExtra={q.data ? (role === 'student' ? studentStats : staffStats) : undefined}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      {q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : role === 'student' ? (
        <>
          <AppButton title="Scan QR code" icon="qr-code-outline" onPress={() => router.push('/scan')} />
          <SectionTitle title="Open for check-in" />
          {available.length === 0 ? (
            <EmptyState icon="calendar-clear-outline" title="No events open right now" message="When a teacher opens an event it will show up here." />
          ) : (
            available.slice(0, 4).map((e) => <EventCard key={e.id} event={e} />)
          )}
          <SectionTitle title="Recent check-ins" />
          {mine.length === 0 ? (
            <EmptyState icon="time-outline" title="No attendance yet" message="Your confirmed check-ins will appear here." />
          ) : (
            mine.slice(0, 3).map((m) => (
              <Card key={m.id}>
                <Text style={styles.recentTitle}>{m.event?.title ?? 'Event'}</Text>
                <Text style={styles.recentMeta}>{formatDateTime(m.scanned_at)}</Text>
              </Card>
            ))
          )}
        </>
      ) : (
        <>
          <AppButton title="Create event" icon="add-circle-outline" onPress={() => router.push('/event/form')} />
          {isStaff && role === 'admin' && (
            <AppButton title="Manage users and reports" icon="shield-checkmark-outline" variant="secondary" onPress={() => router.push('/admin')} />
          )}
          <SectionTitle title="Open events" />
          {available.length === 0 ? (
            <EmptyState icon="calendar-clear-outline" title="No open events" message="Create an event to generate its QR code." />
          ) : (
            available.slice(0, 5).map((e) => (
              <EventCard key={e.id} event={e} showCount showCreator={role === 'admin'} onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })} />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  recentTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  recentMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
