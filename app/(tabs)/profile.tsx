import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import Field from '@/components/Field';
import Screen from '@/components/Screen';
import { Avatar, Banner, Card, RoleBadge } from '@/components/ui';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { confirmAction } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import { updateProfile } from '@/lib/profiles';
import { validateName } from '@/lib/validation';

const ROLE_BLURB = {
  student: 'Scan event QR codes to record attendance and review your history.',
  teacher: 'Create events, show their QR codes, and monitor attendance live.',
  admin: 'Manage users and events, and correct attendance records.',
} as const;

export default function ProfileScreen() {
  const { user, profile, role, refreshProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const startEdit = () => {
    setName(profile?.full_name ?? '');
    setIdNumber(profile?.id_number ?? '');
    setNameError(null);
    setBanner(null);
    setEditing(true);
  };

  // Event: "Save" pressed -> validate -> update own profile row (RLS: own row only).
  const save = async () => {
    const err = validateName(name);
    setNameError(err);
    if (err || !user) return;
    setSaving(true);
    const { error } = await updateProfile(user.id, {
      full_name: name.trim(),
      id_number: idNumber.trim() || null,
    });
    setSaving(false);
    if (error) return setBanner({ tone: 'error', message: error });
    await refreshProfile();
    setEditing(false);
    setBanner({ tone: 'success', message: 'Profile updated.' });
  };

  // Event: "Sign out" pressed -> confirm -> clear session -> route guard returns to login.
  const handleSignOut = async () => {
    const ok = await confirmAction('Sign out?', 'You will need to sign in again to use the app.', 'Sign out', true);
    if (ok) await signOut();
  };

  return (
    <Screen
      title="Profile"
      subtitle={ROLE_BLURB[role]}
      headerExtra={
        <View style={styles.hero}>
          <Avatar name={profile?.full_name ?? user?.email} size={64} tone={COLORS.primary} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName} numberOfLines={1}>{profile?.full_name || 'Add your name'}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={{ marginTop: 8 }}><RoleBadge role={role} /></View>
          </View>
        </View>
      }
    >
      {banner && <Banner tone={banner.tone} message={banner.message} onClose={() => setBanner(null)} />}

      <Card>
        {editing ? (
          <>
            <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" error={nameError} maxLength={80} />
            {role === 'student' && <Field label="Student ID" value={idNumber} onChangeText={setIdNumber} autoCapitalize="characters" maxLength={30} />}
            <AppButton title="Save changes" icon="save-outline" onPress={save} loading={saving} />
            <AppButton title="Cancel" variant="secondary" onPress={() => setEditing(false)} disabled={saving} />
          </>
        ) : (
          <>
            <Row label="Full name" value={profile?.full_name || '-'} />
            <Row label="Email" value={user?.email ?? '-'} />
            <Row label="Role" value={role[0].toUpperCase() + role.slice(1)} />
            {role === 'student' && <Row label="Student ID" value={profile?.id_number || '-'} />}
            <Row label="Member since" value={formatDate(profile?.created_at)} last />
            <View style={{ marginTop: 14 }}>
              <AppButton title="Edit profile" icon="create-outline" variant="secondary" onPress={startEdit} />
            </View>
          </>
        )}
      </Card>

      <AppButton title="Sign out" icon="log-out-outline" variant="danger" onPress={handleSignOut} />
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18 },
  heroName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroEmail: { fontSize: 14, color: COLORS.onInkMuted, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, gap: 16 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 14, color: COLORS.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flexShrink: 1, textAlign: 'right' },
});
