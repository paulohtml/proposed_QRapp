import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { COLORS, RADIUS } from '@/constants/colors';

type Props = {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
};

const PALETTE = {
  primary: { bg: COLORS.primary, fg: '#FFFFFF', border: COLORS.primary },
  secondary: { bg: COLORS.card, fg: COLORS.textPrimary, border: COLORS.border },
  danger: { bg: COLORS.dangerTint, fg: COLORS.danger, border: COLORS.dangerTint },
  ghost: { bg: 'transparent', fg: COLORS.primary, border: 'transparent' },
} as const;

export default function AppButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  loading,
  disabled,
  compact,
  fullWidth = true,
}: Props) {
  const p = PALETTE[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        fullWidth ? styles.full : styles.auto,
        { backgroundColor: p.bg, borderColor: p.border },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        inactive && { opacity: 0.55 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 17 : 20} color={p.fg} style={styles.icon} />}
          <Text style={[styles.label, compact && styles.labelCompact, { color: p.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  compact: { minHeight: 42, paddingHorizontal: 14, marginBottom: 0 },
  full: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start' },
  icon: { marginRight: 8 },
  label: { fontSize: 16, fontWeight: '700' },
  labelCompact: { fontSize: 14 },
});
