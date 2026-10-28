import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Screen from '@/components/Screen';
import { AccessDenied, AttendanceBadge, Card, EmptyState, ErrorState, LoadingState, Segmented, StatTile } from '@/components/ui';
import { COLORS } from '@/constants/colors';
import { getMyAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';

export default function HistoryScreen() {
  const { role } = useAuth();
  if (role !== 'student') return <AccessDenied message="Attendance history is for student accounts. Staff can use the Records tab." />;
  return <History />;
}

function History() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'present' | 'late'>('all');
  const q = useQuery(() => getMyAttendance(user!.id), [user?.id]);
  const rows = q.data ?? [];
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <Screen
      title="My attendance"
      subtitle="Every event you've checked in to"
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      headerExtra={
        <View style={styles.stats}>
          <StatTile label="Total" value={rows.length} icon="checkmark-done" tone="#5EE0B0" />
          <StatTile label="On time" value={rows.filter((r) => r.status === 'present').length} icon="time" tone="#7FB0FF" />
          <StatTile label="Late" value={rows.filter((r) => r.status === 'late').length} icon="alert-circle" tone="#FFC46B" />
        </View>
      }
    >
      {q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon="qr-code-outline" title="No attendance yet" message="Scan an event's QR code and your check-in will be listed here." />
      ) : (
        <>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'present', label: 'On time' }, { value: 'late', label: 'Late' }]}
          />
          {shown.length === 0 ? (
            <EmptyState icon="funnel-outline" title="Nothing in this filter" />
          ) : (
            shown.map((r) => (
              <Card key={r.id}>
                <View style={styles.top}>
                  <Text style={styles.title} numberOfLines={2}>{r.event?.title ?? 'Event'}</Text>
                  <AttendanceBadge status={r.status} />
                </View>
                {r.event?.venue ? (
                  <View style={styles.row}>
                    <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.meta}>{r.event.venue}</Text>
                  </View>
                ) : null}
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.meta}>{formatDate(r.event?.start_time ?? r.scanned_at)}</Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
                  <Text style={styles.meta}>Checked in {formatDateTime(r.scanned_at)}</Text>
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: 14, color: COLORS.textSecondary, flexShrink: 1 },
});
