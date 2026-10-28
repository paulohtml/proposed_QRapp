import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AttendanceList from '@/components/AttendanceList';
import Screen from '@/components/Screen';
import { AccessDenied, Card, EmptyState, ErrorState, LoadingState, ProgressBar, SearchBar, Segmented, StatTile } from '@/components/ui';
import { COLORS } from '@/constants/colors';
import { getAllAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { listEvents } from '@/lib/events';
import { eventWhen } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';

export default function RecordsRoute() {
  const { isStaff } = useAuth();
  if (!isStaff) return <AccessDenied message="Attendance records are available to teachers and administrators." />;
  return <Records />;
}

function Records() {
  const { user, role, isAdmin } = useAuth();
  const [view, setView] = useState<'events' | 'all'>('events');
  const [term, setTerm] = useState('');

  const q = useQuery(async () => {
    const [events, rows] = await Promise.all([
      listEvents(role === 'teacher' ? { ownerId: user!.id } : {}),
      getAllAttendance(),
    ]);
    return { events, rows };
  }, [user?.id, role]);

  const events = q.data?.events ?? [];
  const rows = q.data?.rows ?? [];
  const total = events.reduce((n, e) => n + (e.attendance?.[0]?.count ?? 0), 0);
  const max = Math.max(1, ...events.map((e) => e.attendance?.[0]?.count ?? 0));

  const filteredRows = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => `${r.student?.full_name ?? ''} ${r.student?.email ?? ''} ${r.student?.id_number ?? ''} ${r.event?.title ?? ''}`.toLowerCase().includes(t));
  }, [rows, term]);

  return (
    <Screen
      title="Attendance records"
      subtitle={isAdmin ? 'Everything recorded across the school' : 'Check-ins for your events'}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      headerExtra={
        <View style={styles.stats}>
          <StatTile label="Events" value={events.length} icon="calendar" tone="#7FB0FF" />
          <StatTile label="Check-ins" value={total} icon="people" tone="#5EE0B0" />
          <StatTile label="Avg / event" value={events.length ? (total / events.length).toFixed(1) : '0'} icon="analytics" tone="#FFC46B" />
        </View>
      }
    >
      <Segmented value={view} onChange={setView} options={[{ value: 'events', label: 'By event' }, { value: 'all', label: 'All check-ins' }]} />

      {q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : view === 'events' ? (
        events.length === 0 ? (
          <EmptyState icon="stats-chart-outline" title="No events yet" message="Create an event and its attendance summary will appear here." />
        ) : (
          events.map((e) => {
            const c = e.attendance?.[0]?.count ?? 0;
            return (
              <Card key={e.id} onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}>
                <Text style={styles.title} numberOfLines={1}>{e.title}</Text>
                <Text style={styles.meta}>{eventWhen(e)}</Text>
                <View style={styles.barRow}>
                  <View style={{ flex: 1 }}><ProgressBar value={c} max={max} /></View>
                  <Text style={styles.count}>{c}</Text>
                </View>
              </Card>
            );
          })
        )
      ) : (
        <>
          <SearchBar value={term} onChangeText={setTerm} placeholder="Search student, ID or event" />
          {filteredRows.length === 0 ? (
            <EmptyState icon="search-outline" title={term ? 'No matching records' : 'No check-ins yet'} message={term ? 'Try a different name or event.' : undefined} />
          ) : (
            <AttendanceList rows={filteredRows} showEvent canEdit={isAdmin} onChanged={q.reload} />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  count: { fontSize: 15, fontWeight: '800', color: COLORS.primary, minWidth: 28, textAlign: 'right' },
});
