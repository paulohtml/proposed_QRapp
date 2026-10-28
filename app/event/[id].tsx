import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import AttendanceList from '@/components/AttendanceList';
import Screen from '@/components/Screen';
import { ActionSheet, AccessDenied, Avatar, Banner, Card, ErrorState, EventStatusBadge, LoadingState, SearchBar, SectionTitle } from '@/components/ui';
import { COLORS, RADIUS } from '@/constants/colors';
import { listStudents } from '@/lib/admin';
import { addAttendanceManually, getEventAttendance, subscribeToEventAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { confirmAction } from '@/lib/confirm';
import { deleteEvent, getEvent, getEventToken, rotateEventToken, setEventStatus } from '@/lib/events';
import { effectiveStatus, eventWhen } from '@/lib/format';
import { buildQRPayload } from '@/lib/qr';
import type { Profile } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';

export default function EventDetailRoute() {
  const { isStaff } = useAuth();
  if (!isStaff) return <AccessDenied message="Only teachers and administrators can open event details." />;
  return <EventDetail />;
}

function EventDetail() {
  const { user, isAdmin } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [tokenOverride, setTokenOverride] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [adding, setAdding] = useState(false);

  const q = useQuery(async () => {
    const [event, token, attendance] = await Promise.all([getEvent(id), getEventToken(id), getEventAttendance(id)]);
    return { event, token, attendance };
  }, [id]);

  // Real-time: Supabase pushes a message when a student checks in -> refresh the list.
  const reloadRef = useRef(q.reload);
  reloadRef.current = q.reload;
  useEffect(() => {
    if (!id) return;
    setLive(true);
    const unsubscribe = subscribeToEventAttendance(id, () => reloadRef.current());
    return () => {
      setLive(false);
      unsubscribe();
    };
  }, [id]);

  const event = q.data?.event ?? null;
  const token = tokenOverride ?? q.data?.token ?? null;
  const rows = q.data?.attendance ?? [];
  const counts = useMemo(
    () => ({
      present: rows.filter((r) => r.status === 'present').length,
      late: rows.filter((r) => r.status === 'late').length,
      excused: rows.filter((r) => r.status === 'excused').length,
      absent: rows.filter((r) => r.status === 'absent').length,
    }),
    [rows]
  );

  if (q.loading) return <Screen title="Event" onBack={() => router.back()}><LoadingState /></Screen>;
  if (q.error) return <Screen title="Event" onBack={() => router.back()}><ErrorState message={q.error} onRetry={q.reload} /></Screen>;
  if (!event) {
    return (
      <Screen title="Event" onBack={() => router.back()}>
        <ErrorState message="This event doesn't exist or you don't have access to it." />
      </Screen>
    );
  }

  const status = effectiveStatus(event);
  const accepting = status === 'live' || status === 'upcoming';
  const isOwner = event.created_by === user?.id;
  const canManage = isOwner || isAdmin;

  // Event: "Close event" / "Reopen" pressed -> update status -> QR immediately stops/starts working.
  const toggleStatus = async () => {
    const closing = event.status === 'open';
    if (closing) {
      const ok = await confirmAction('Close this event?', 'Students will no longer be able to check in.', 'Close event', true);
      if (!ok) return;
    }
    setBusy('status');
    const { error } = await setEventStatus(event.id, closing ? 'closed' : 'open');
    setBusy(null);
    if (error) setBanner({ tone: 'error', message: error });
    else {
      setBanner({ tone: 'success', message: closing ? 'Event closed.' : 'Event reopened.' });
      q.reload();
    }
  };

  const replaceQR = async () => {
    const ok = await confirmAction('Replace the QR code?', 'Any printed or shared copies of the old QR will stop working.', 'Replace');
    if (!ok) return;
    setBusy('rotate');
    const { token: fresh, error } = await rotateEventToken(event.id);
    setBusy(null);
    if (error || !fresh) setBanner({ tone: 'error', message: error ?? 'Could not replace the QR code.' });
    else {
      setTokenOverride(fresh);
      setBanner({ tone: 'success', message: 'New QR code generated.' });
    }
  };

  const remove = async () => {
    const ok = await confirmAction('Delete this event?', 'This permanently removes the event and its QR code.', 'Delete', true);
    if (!ok) return;
    setBusy('delete');
    const { error } = await deleteEvent(event.id);
    setBusy(null);
    if (error) setBanner({ tone: 'error', message: error });
    else router.back();
  };

  return (
    <Screen
      title={event.title}
      subtitle={eventWhen(event)}
      onBack={() => router.back()}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      headerExtra={
        <View style={styles.headRow}>
          <EventStatusBadge event={event} />
          <Text style={styles.code}>{event.event_code}</Text>
          {live && (
            <View style={styles.live}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          )}
        </View>
      }
    >
      {banner && <Banner tone={banner.tone} message={banner.message} onClose={() => setBanner(null)} />}

      <Card>
        {event.venue ? <InfoRow icon="location-outline" text={event.venue} /> : null}
        {event.description ? <InfoRow icon="document-text-outline" text={event.description} /> : null}
        <InfoRow icon="alarm-outline" text={`Marked late after ${event.late_after_minutes} minutes`} />
        {event.creator ? <InfoRow icon="person-outline" text={`Created by ${event.creator.full_name || event.creator.email}`} /> : null}
      </Card>

      <SectionTitle title="Attendance QR" />
      <Card style={{ alignItems: 'center' }}>
        {token ? (
          <>
            <View style={[styles.qrBox, !accepting && { opacity: 0.25 }]}>
              <QRCode value={buildQRPayload(token)} size={210} />
            </View>
            {!accepting && (
              <Banner tone="warning" message={status === 'closed' ? 'Event is closed. This QR no longer records attendance.' : 'Event has ended. This QR no longer records attendance.'} />
            )}
            <Text style={styles.qrHint}>Students scan this with the Scan tab.</Text>
            <View style={styles.btnRow}>
              <View style={{ flex: 1 }}><AppButton compact title="Full screen" icon="expand-outline" variant="secondary" onPress={() => setFullscreen(true)} /></View>
              {canManage && <View style={{ flex: 1 }}><AppButton compact title="Replace QR" icon="refresh" variant="secondary" loading={busy === 'rotate'} onPress={replaceQR} /></View>}
            </View>
          </>
        ) : (
          <Text style={styles.qrHint}>The QR code is not available for your account.</Text>
        )}
      </Card>

      {canManage && (
        <View style={{ marginTop: 4 }}>
          <AppButton
            title={event.status === 'open' ? 'Close event' : 'Reopen event'}
            icon={event.status === 'open' ? 'lock-closed-outline' : 'lock-open-outline'}
            variant={event.status === 'open' ? 'danger' : 'primary'}
            loading={busy === 'status'}
            onPress={toggleStatus}
          />
          <View style={styles.btnRow}>
            <View style={{ flex: 1 }}><AppButton compact title="Edit" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/event/form', params: { id: event.id } })} /></View>
            <View style={{ flex: 1 }}><AppButton compact title="Delete" icon="trash-outline" variant="danger" loading={busy === 'delete'} onPress={remove} /></View>
          </View>
        </View>
      )}

      <SectionTitle
        title={`Attendance (${rows.length})`}
        action={isAdmin ? <AppButton compact fullWidth={false} title="Add student" icon="person-add-outline" variant="ghost" onPress={() => setAdding(true)} /> : undefined}
      />
      <View style={styles.summary}>
        <Pill label="Present" value={counts.present} color={COLORS.success} bg={COLORS.successTint} />
        <Pill label="Late" value={counts.late} color={COLORS.warning} bg={COLORS.warningTint} />
        <Pill label="Excused" value={counts.excused} color={COLORS.primary} bg={COLORS.primaryTint} />
        <Pill label="Absent" value={counts.absent} color={COLORS.danger} bg={COLORS.dangerTint} />
      </View>
      <AttendanceList rows={rows} canEdit={isAdmin} onChanged={q.reload} />

      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <View style={styles.full}>
          <Text style={styles.fullTitle}>{event.title}</Text>
          <Text style={styles.fullSub}>{event.venue}</Text>
          <View style={[styles.qrBox, { marginVertical: 28 }, !accepting && { opacity: 0.25 }]}>
            {token ? <QRCode value={buildQRPayload(token)} size={300} /> : null}
          </View>
          <Text style={styles.fullSub}>{accepting ? 'Scan to check in' : 'Check-in is closed'}</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 30 }}>
            <AppButton title="Close" icon="close" variant="secondary" onPress={() => setFullscreen(false)} />
          </View>
        </View>
      </Modal>

      {isAdmin && (
        <AddStudentSheet
          visible={adding}
          onClose={() => setAdding(false)}
          existingIds={rows.map((r) => r.student_id)}
          onPick={async (s) => {
            const { error } = await addAttendanceManually(event.id, s.id, user!.id, 'present');
            setAdding(false);
            if (error) setBanner({ tone: 'error', message: error });
            else {
              setBanner({ tone: 'success', message: `${s.full_name || s.email} added as present.` });
              q.reload();
            }
          }}
        />
      )}
    </Screen>
  );
}

function AddStudentSheet({ visible, onClose, existingIds, onPick }: { visible: boolean; onClose: () => void; existingIds: string[]; onPick: (s: Profile) => void }) {
  const [term, setTerm] = useState('');
  const students = useQuery(listStudents, []);
  const list = (students.data ?? [])
    .filter((s) => !existingIds.includes(s.id))
    .filter((s) => `${s.full_name ?? ''} ${s.email} ${s.id_number ?? ''}`.toLowerCase().includes(term.trim().toLowerCase()))
    .slice(0, 25);
  return (
    <ActionSheet visible={visible} title="Add student manually" subtitle="For students who couldn't scan. Marked as present." onClose={onClose}>
      <SearchBar value={term} onChangeText={setTerm} placeholder="Search name, email or ID" />
      {students.loading ? <LoadingState /> : list.length === 0 ? (
        <Text style={styles.qrHint}>No matching students.</Text>
      ) : (
        list.map((s) => (
          <Pressable key={s.id} style={styles.pick} onPress={() => onPick(s)}>
            <Avatar name={s.full_name ?? s.email} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickName} numberOfLines={1}>{s.full_name || s.email}</Text>
              <Text style={styles.pickMeta} numberOfLines={1}>{s.id_number || s.email}</Text>
            </View>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          </Pressable>
        ))
      )}
    </ActionSheet>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function Pill({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  code: { fontSize: 12, color: COLORS.onInkMuted, fontWeight: '600' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5EE0B0' },
  liveText: { fontSize: 12, fontWeight: '700', color: '#5EE0B0' },
  info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 5 },
  infoText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  qrBox: { backgroundColor: '#fff', padding: 14, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  qrHint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginVertical: 12 },
  btnRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginBottom: 12 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pill: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center' },
  pillValue: { fontSize: 20, fontWeight: '800' },
  pillLabel: { fontSize: 11, fontWeight: '700' },
  full: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 28 },
  fullTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  fullSub: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  pickMeta: { fontSize: 12, color: COLORS.textSecondary },
});
