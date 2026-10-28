import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { COLORS, RADIUS } from '@/constants/colors';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  /** Show a show/hide toggle (for passwords). */
  secure?: boolean;
};

export default function Field({ label, error, hint, secure, style, multiline, ...rest }: Props) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.box,
          focused && styles.boxFocused,
          !!error && styles.boxError,
          multiline && { alignItems: 'flex-start' },
        ]}
      >
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={COLORS.textMuted}
          accessibilityLabel={label}
          style={[styles.input, multiline && { minHeight: 84, textAlignVertical: 'top' }, style]}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textSecondary} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
  },
  boxFocused: { borderColor: COLORS.primary },
  boxError: { borderColor: COLORS.danger },
  input: { flex: 1, fontSize: 16, color: COLORS.textPrimary, paddingVertical: 13 },
  error: { fontSize: 13, color: COLORS.danger, marginTop: 5 },
  hint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 5 },
});
