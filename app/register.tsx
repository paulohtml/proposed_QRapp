import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Field from '@/components/Field';
import Header from '@/components/Header';
import { Banner } from '@/components/ui';
import { COLORS, RADIUS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { passwordStrength, validateEmail, validateName, validatePassword } from '@/lib/validation';

type Errors = { name?: string; email?: string; password?: string; confirm?: string; idNumber?: string };

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);
  const strengthLabel = ['Too weak', 'Weak', 'Good', 'Strong'][strength];
  const strengthColor = [COLORS.danger, COLORS.warning, COLORS.primary, COLORS.success][strength];

  // Event: "Create account" pressed -> validate -> sign up (always as a student).
  const handleRegister = async () => {
    setFormError(null);
    const next: Errors = {
      name: validateName(fullName) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirm: password !== confirm ? 'Passwords do not match.' : undefined,
      idNumber: idNumber.length > 30 ? 'ID number is too long.' : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    const { error, needsConfirmation } = await signUp({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      idNumber: idNumber.trim(),
    });
    setLoading(false);
    if (error) setFormError(error);
    else if (needsConfirmation) setConfirmSent(true);
    // otherwise a session exists and the route guard moves us into the app
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Header title="Create account" subtitle="Student registration" />
        <View style={styles.sheet}>
          {confirmSent ? (
            <View>
              <Banner tone="success" message="Account created. Check your email for a confirmation link." />
              <Text style={styles.subtitle}>
                We sent a link to {email.trim()}. Open it to verify your account, then sign in.
              </Text>
              <Link href="/login" style={[styles.link, { textAlign: 'center' }]}>Back to sign in</Link>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Teacher and administrator accounts are assigned by your school administrator.
              </Text>
              {formError && <Banner tone="error" message={formError} />}
              <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Juan dela Cruz" autoCapitalize="words" editable={!loading} error={errors.name} />
              <Field label="Student ID (optional)" value={idNumber} onChangeText={setIdNumber} placeholder="e.g. 2026-00123" autoCapitalize="characters" editable={!loading} error={errors.idNumber} />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@school.edu" autoCapitalize="none" autoComplete="email" keyboardType="email-address" editable={!loading} error={errors.email} />
              <Field label="Password" value={password} onChangeText={setPassword} placeholder="8+ characters, letters and numbers" secure autoCapitalize="none" editable={!loading} error={errors.password} hint={password ? `Strength: ${strengthLabel}` : undefined} />
              {password ? (
                <View style={styles.meter}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.meterBar, { backgroundColor: i < strength ? strengthColor : COLORS.border }]} />
                  ))}
                </View>
              ) : null}
              <Field label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" secure autoCapitalize="none" editable={!loading} error={errors.confirm} onSubmitEditing={handleRegister} />
              <AppButton title="Create account" icon="person-add-outline" onPress={handleRegister} loading={loading} />
              <Text style={styles.footer}>
                Already registered? <Link href="/login" style={styles.link}>Sign in</Link>
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.ink },
  scroll: { flexGrow: 1 },
  sheet: { flexGrow: 1, backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl + 6, borderTopRightRadius: RADIUS.xl + 6, padding: 24, paddingTop: 28 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 18, lineHeight: 20 },
  meter: { flexDirection: 'row', gap: 6, marginTop: -8, marginBottom: 14 },
  meterBar: { flex: 1, height: 4, borderRadius: 2 },
  footer: { textAlign: 'center', fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  link: { color: COLORS.primary, fontWeight: '700' },
});
