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
import { validateEmail } from '@/lib/validation';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, notice, clearNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Event: "Sign in" pressed -> validate -> authenticate -> router guard moves us into the app.
  const handleLogin = async () => {
    clearNotice();
    setFormError(null);
    const next = {
      email: validateEmail(email) ?? undefined,
      password: password ? undefined : 'Password is required.',
    };
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) setFormError(error);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Header title="QR Attendance" subtitle="Check in to school events in seconds" />

        <View style={styles.sheet}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Use the account you registered with.</Text>

          {notice && <Banner tone="warning" message={notice} onClose={clearNotice} />}
          {formError && <Banner tone="error" message={formError} />}

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@school.edu"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!loading}
            error={errors.email}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secure
            autoCapitalize="none"
            autoComplete="password"
            editable={!loading}
            error={errors.password}
            onSubmitEditing={handleLogin}
          />
          <AppButton title="Sign in" icon="log-in-outline" onPress={handleLogin} loading={loading} />

          <Text style={styles.footer}>
            New student?{' '}
            <Link href="/register" style={styles.link}>Create an account</Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.ink },
  scroll: { flexGrow: 1, justifyContent: 'flex-start' },
  sheet: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl + 6,
    borderTopRightRadius: RADIUS.xl + 6,
    padding: 24,
    paddingTop: 28,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 20 },
  footer: { textAlign: 'center', fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  link: { color: COLORS.primary, fontWeight: '700' },
});
