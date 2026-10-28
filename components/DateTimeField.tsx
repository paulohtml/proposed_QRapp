import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADIUS } from '@/constants/colors';
import { formatDateTime } from '@/lib/format';

type Props = { label: string; value: Date; onChange: (d: Date) => void; error?: string | null };

function toInputValue(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Date + time picker that works on Android, iOS and web. */
export default function DateTimeField({ label, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState<'date' | 'time'>('date');
  const isAndroid = Platform.OS === 'android';

  const handle = (e: DateTimePickerEvent, selected?: Date) => {
    if (e.type === 'dismissed' || !selected) {
      setOpen(false);
      setPart('date');
      return;
    }
    const next = new Date(value);
    if (isAndroid && part === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(next);
      setPart('time');
      return;
    }
    if (isAndroid) {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(next);
    } else {
      onChange(selected);
    }
    if (isAndroid) {
      setOpen(false);
      setPart('date');
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'web' ? (
        createElement('input', {
          type: 'datetime-local',
          value: toInputValue(value),
          onChange: (e: any) => {
            const d = new Date(e.target.value);
            if (!Number.isNaN(d.getTime())) onChange(d);
          },
          style: {
            fontSize: 16,
            padding: 13,
            borderRadius: RADIUS.md,
            border: `1.5px solid ${error ? COLORS.danger : COLORS.border}`,
            backgroundColor: '#fff',
            color: COLORS.textPrimary,
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
          },
        })
      ) : (
        <>
          <Pressable
            onPress={() => {
              setPart('date');
              setOpen((o) => !o);
            }}
            style={[styles.box, !!error && { borderColor: COLORS.danger }]}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${formatDateTime(value)}`}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.value}>{formatDateTime(value)}</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </Pressable>
          {open && (
            <DateTimePicker
              value={value}
              mode={isAndroid ? part : 'datetime'}
              display={isAndroid ? 'default' : 'spinner'}
              onChange={handle}
            />
          )}
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 14 },
  value: { flex: 1, fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },
  error: { fontSize: 13, color: COLORS.danger, marginTop: 5 },
});
