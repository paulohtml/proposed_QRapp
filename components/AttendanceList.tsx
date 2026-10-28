import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { removeAttendance, setAttendanceStatus } from '@/lib/attendance';
import { confirmAction } from '@/lib/confirm';
import { displayName, formatDateTime, formatTime } from '@/lib/format';
import type { AttendanceRow, AttendanceStatus } from '@/lib/types';
import { ActionSheet, AttendanceBadge, Avatar, Banner, Card, EmptyState } from './ui';

type Props = {
  rows: AttendanceRow[];
  /** Admins can correct records (status change / remove). */
  canEdit?: boolean;
  /** Show which event each row belongs to (used in the "all check-ins" view). */
  showEvent?: boolean;
  onChanged: () => void;
  emptyMessage?: string;
};

const STATUSES: AttendanceStatus[] = ['present', 'late', 'excused', 'absent'];

export default function AttendanceList({ rows, canEdit, showEvent, onChanged, emptyMessage }: Props) {
  const [selected, setSelected] = useState<AttendanceRow | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  if (rows.length === 0) {
    return <EmptyState icon="people-outline" title="No attendance yet" message={emptyMessage ?? 'Records appear here as students check in.'} />;
  }

  // Event: admin picks a new status -> update row -> refresh list.
  const changeStatus = async (status: AttendanceStatus) => {
    if (!selected) return;
    const { error } = await setAttendanceStatus(selected.id, status);
    setSelected(null);
    if (error) setFeedback({ tone: 'error', message: error });
    else {
      setFeedback({ tone: 'success', message: 'Attendance updated.' });
      onChanged();
    }
  };

  const remove = async () => {
    if (!selected) return;
    const name = displayName(selected.student);
    const ok = await confirmAction('Remove record?', `${name} will no longer be marked for this event.`, 'Remove', true);
    if (!ok) return;
    const { error } = await removeAttendance(selected.id);
    setSelected(null);
    if (error) setFeedback({ tone: 'error', message: error });
    else {
      setFeedback({ tone: 'success', message: 'Record removed.' });
      onChanged();
    }
  };

  return (
    <View>
      {feedback && <Banner tone={feedback.tone} message={feedback.message} onClose={() => setFeedback(null)} />}
      {rows.map((r) => (
        <Card key={r.id} onPress={canEdit ? () => setSelected(r) : undefined} style={styles.row}>
          <View style={styles.rowInner}>
            <Avatar name={r.student?.full_name ?? r.student?.email} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{displayName(r.student)}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {showEvent ? `${r.event?.title ?? 'Event'} - ${formatDateTime(r.scanned_at)}` : `${r.student?.id_number ? `${r.student.id_number} - ` : ''}${formatTime(r.scanned_at)}`}
              </Text>
            </View>
            <AttendanceBadge status={r.status} />
          </View>
        </Card>
      ))}

      <ActionSheet
        visible={!!selected}
        title={selected ? displayName(selected.student) : ''}
        subtitle="Correct this attendance record"
        onClose={() => setSelected(null)}
        actions={[
          ...STATUSES.filter((s) => s !== selected?.status).map((s) => ({
            label: `Mark as ${s}`,
            icon: (s === 'present' ? 'checkmark-circle-outline' : s === 'late' ? 'time-outline' : s === 'excused' ? 'document-text-outline' : 'close-circle-outline') as any,
            onPress: () => changeStatus(s),
          })),
          { label: 'Remove record', icon: 'trash-outline' as any, destructive: true, onPress: remove },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { padding: 12, marginBottom: 8 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
