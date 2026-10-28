import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Screen from '@/components/Screen';
import { AccessDenied, ActionSheet, Avatar, Badge, Banner, Card, EmptyState, ErrorState, LoadingState, ProgressBar, RoleBadge, SearchBar, Segmented, SectionTitle, StatTile } from '@/components/ui';
import { COLORS } from '@/constants/colors';
import { getSystemReport, listUsers, setUserActive, setUserRole } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { confirmAction } from '@/lib/confirm';
import type { Profile, Role } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';

export default function AdminRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <AccessDenied message="Only administrators can manage users and view system reports." />;
  return <Admin />;
}

function Admin() {
  const { user } = useAuth();
  const [view, setView] = useState<'users' | 'reports'>('users');
  const [role, setRole] = useState<'all' | Role>('all');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const users = useQuery(listUsers, []);
  const report = useQuery(getSystemReport, []);

  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (users.data ?? []).filter((u) => (role === 'all' || u.role === role) && (!t || `${u.full_name ?? ''} ${u.email} ${u.id_number ?? ''}`.toLowerCase().includes(t)));
  }, [users.data, role, term]);

  const apply = async (fn: () => Promise<{ error: string | null }>, ok: string) => {
    setSelected(null);
    const { error } = await fn();
    if (error) setBanner({ tone: 'error', message: error });
    else {
      setBanner({ tone: 'success', message: ok });
      users.reload();
      report.reload();
    }
  };

  // Event: admin picks a new role -> confirm -> update profile -> list refreshes.
  const changeRole = async (target: Profile, next: Role) => {
    const ok = await confirmAction('Change role?', `${target.full_name || target.email} will become a ${next}.`, 'Change role', next === 'admin');
    if (ok) apply(() => setUserRole(target.id, next), `Role changed to ${next}.`);
    else setSelected(null);
  };

  const toggleActive = async (target: Profile) => {
    const deactivating = target.is_active;
    const ok = await confirmAction(
      deactivating ? 'Deactivate account?' : 'Reactivate account?',
      deactivating ? 'They will be signed out and unable to use the app.' : 'They will be able to sign in again.',
      deactivating ? 'Deactivate' : 'Reactivate',
      deactivating
    );
    if (ok) apply(() => setUserActive(target.id, !target.is_active), deactivating ? 'Account deactivated.' : 'Account reactivated.');
    else setSelected(null);
  };

  const r = report.data;
  const refreshing = view === 'users' ? users.refreshing : report.refreshing;

  return (
    <Screen title="Administration" subtitle="Manage users and review system reports" refreshing={refreshing} onRefresh={view === 'users' ? users.refresh : report.refresh}>
      <Segmented value={view} onChange={setView} options={[{ value: 'users', label: 'Users' }, { value: 'reports', label: 'Reports' }]} />
      {banner && <Banner tone={banner.tone} message={banner.message} onClose={() => setBanner(null)} />}

      {view === 'users' ? (
        users.loading ? <LoadingState /> : users.error ? <ErrorState message={users.error} onRetry={users.reload} /> : (
          <>
            <SearchBar value={term} onChangeText={setTerm} placeholder="Search name, email or ID" />
            <Segmented<'all' | Role>
              value={role}
              onChange={setRole}
              options={[{ value: 'all', label: 'All' }, { value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers' }, { value: 'admin', label: 'Admins' }]}
            />
            {shown.length === 0 ? (
              <EmptyState icon="people-outline" title="No users found" message="Try a different search or filter." />
            ) : (
              shown.map((u) => (
                <Card key={u.id} style={{ padding: 12 }} onPress={u.id === user?.id ? undefined : () => setSelected(u)}>
                  <View style={styles.userRow}>
                    <Avatar name={u.full_name ?? u.email} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{u.full_name || 'No name set'}{u.id === user?.id ? ' (you)' : ''}</Text>
                      <Text style={styles.meta} numberOfLines={1}>{u.email}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <RoleBadge role={u.role} />
                      {!u.is_active && <Badge label="Inactive" tone="danger" />}
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        )
      ) : report.loading ? <LoadingState /> : report.error || !r ? <ErrorState message={report.error ?? 'No data.'} onRetry={report.reload} /> : (
        <>
          <View style={styles.tiles}>
            <Tile label="Students" value={r.users.student} />
            <Tile label="Teachers" value={r.users.teacher} />
            <Tile label="Admins" value={r.users.admin} />
          </View>
          <View style={styles.tiles}>
            <Tile label="Events" value={r.events.total} />
            <Tile label="Open" value={r.events.open} />
            <Tile label="Closed" value={r.events.closed} />
          </View>

          <SectionTitle title="Attendance by status" />
          <Card>
            <Text style={styles.big}>{r.attendance.total} <Text style={styles.bigLabel}>total check-ins</Text></Text>
            {(['present', 'late', 'excused', 'absent'] as const).map((s) => (
              <View key={s} style={{ marginTop: 12 }}>
                <View style={styles.barLabel}>
                  <Text style={styles.name}>{s[0].toUpperCase() + s.slice(1)}</Text>
                  <Text style={styles.meta}>{r.attendance[s]}</Text>
                </View>
                <ProgressBar value={r.attendance[s]} max={r.attendance.total} color={s === 'present' ? COLORS.success : s === 'late' ? COLORS.warning : s === 'excused' ? COLORS.primary : COLORS.danger} />
              </View>
            ))}
          </Card>

          <SectionTitle title="Most attended events" />
          {r.topEvents.length === 0 ? (
            <EmptyState icon="stats-chart-outline" title="No events yet" />
          ) : (
            r.topEvents.map((e, i) => (
              <Card key={e.id} style={{ padding: 12 }}>
                <View style={styles.userRow}>
                  <Text style={styles.rank}>{i + 1}</Text>
                  <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{e.title}</Text>
                  <Text style={styles.count}>{e.count}</Text>
                </View>
              </Card>
            ))
          )}
          {r.users.inactive > 0 && <Banner tone="info" message={`${r.users.inactive} deactivated account${r.users.inactive === 1 ? '' : 's'}.`} />}
        </>
      )}

      <ActionSheet
        visible={!!selected}
        title={selected?.full_name || selected?.email || ''}
        subtitle={selected ? `${selected.email} - currently ${selected.role}` : undefined}
        onClose={() => setSelected(null)}
        actions={
          selected
            ? [
                ...(['student', 'teacher', 'admin'] as Role[])
                  .filter((x) => x !== selected.role)
                  .map((x) => ({ label: `Make ${x}`, icon: (x === 'student' ? 'school-outline' : x === 'teacher' ? 'easel-outline' : 'shield-checkmark-outline') as any, onPress: () => changeRole(selected, x) })),
                { label: selected.is_active ? 'Deactivate account' : 'Reactivate account', icon: (selected.is_active ? 'ban-outline' : 'checkmark-circle-outline') as any, destructive: selected.is_active, onPress: () => toggleActive(selected) },
              ]
            : []
        }
      />
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tile: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  tileValue: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  tileLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  big: { fontSize: 30, fontWeight: '800', color: COLORS.textPrimary },
  bigLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rank: { width: 26, fontSize: 16, fontWeight: '800', color: COLORS.textMuted },
  count: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
});
