import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { COLORS, RADIUS, SHADOW } from '@/constants/colors';
import { effectiveStatus, initials, STATUS_LABEL, type EffectiveStatus } from '@/lib/format';
import type { AttendanceStatus, EventRow, Role } from '@/lib/types';
import AppButton from './AppButton';

type IconName = keyof typeof Ionicons.glyphMap;

// ---------------------------------------------------------------- Card
export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------- Badges
type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: COLORS.successTint, fg: COLORS.success },
  warning: { bg: COLORS.warningTint, fg: COLORS.warning },
  danger: { bg: COLORS.dangerTint, fg: COLORS.danger },
  neutral: { bg: COLORS.neutralTint, fg: COLORS.textSecondary },
  primary: { bg: COLORS.primaryTint, fg: COLORS.primary },
};

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={t.fg} style={{ marginRight: 4 }} />}
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const EVENT_BADGE: Record<EffectiveStatus, { label: string; tone: Tone }> = {
  live: { label: 'Open', tone: 'success' },
  upcoming: { label: 'Upcoming', tone: 'primary' },
  ended: { label: 'Ended', tone: 'warning' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export function EventStatusBadge({ event }: { event: Pick<EventRow, 'status' | 'start_time' | 'end_time'> }) {
  const b = EVENT_BADGE[effectiveStatus(event)];
  return <Badge label={b.label} tone={b.tone} />;
}

const ATT_TONE: Record<AttendanceStatus, Tone> = { present: 'success', late: 'warning', excused: 'primary', absent: 'danger' };
export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return <Badge label={STATUS_LABEL[status]} tone={ATT_TONE[status]} />;
}

const ROLE_TONE: Record<Role, Tone> = { student: 'neutral', teacher: 'primary', admin: 'warning' };
export function RoleBadge({ role }: { role: Role }) {
  return <Badge label={role[0].toUpperCase() + role.slice(1)} tone={ROLE_TONE[role]} />;
}

// ---------------------------------------------------------------- Avatar
export function Avatar({ name, size = 44, tone = COLORS.primaryTint, color = COLORS.primary }: { name?: string | null; size?: number; tone?: string; color?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- States
export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, message, action }: { icon?: IconName; title: string; message?: string; action?: ReactNode }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={30} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {message ? <Text style={styles.stateText}>{message}</Text> : null}
      {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <View style={[styles.stateIcon, { backgroundColor: COLORS.dangerTint }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={COLORS.danger} />
      </View>
      <Text style={styles.stateTitle}>Couldn't load this</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
          <AppButton title="Try again" icon="refresh" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function AccessDenied({ message = 'Your account does not have permission to open this screen.' }: { message?: string }) {
  return (
    <View style={[styles.state, { flex: 1, justifyContent: 'center', backgroundColor: COLORS.background }]}>
      <View style={[styles.stateIcon, { backgroundColor: COLORS.warningTint }]}>
        <Ionicons name="lock-closed" size={30} color={COLORS.warning} />
      </View>
      <Text style={styles.stateTitle}>Access restricted</Text>
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Banner (inline feedback)
export function Banner({ tone, message, onClose }: { tone: 'success' | 'error' | 'warning' | 'info'; message: string; onClose?: () => void }) {
  const map = {
    success: { bg: COLORS.successTint, fg: COLORS.success, icon: 'checkmark-circle' as IconName },
    error: { bg: COLORS.dangerTint, fg: COLORS.danger, icon: 'alert-circle' as IconName },
    warning: { bg: COLORS.warningTint, fg: COLORS.warning, icon: 'warning' as IconName },
    info: { bg: COLORS.primaryTint, fg: COLORS.primary, icon: 'information-circle' as IconName },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: map.bg }]} accessibilityRole="alert">
      <Ionicons name={map.icon} size={20} color={map.fg} />
      <Text style={[styles.bannerText, { color: map.fg }]}>{message}</Text>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color={map.fg} />
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Controls
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentItem, active && styles.segmentActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Search' }: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={COLORS.textMuted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} accessibilityLabel={placeholder} />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatTile({ label, value, icon, tone = COLORS.primary }: { label: string; value: string | number; icon: IconName; tone?: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={tone} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, max, color = COLORS.primary }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

// ---------------------------------------------------------------- Action sheet (works on web + native)
export type SheetAction = { label: string; icon?: IconName; destructive?: boolean; onPress: () => void };

export function ActionSheet({ visible, title, subtitle, actions, onClose, children }: { visible: boolean; title: string; subtitle?: string; actions?: SheetAction[]; onClose: () => void; children?: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
          {actions?.map((a) => (
            <Pressable key={a.label} style={styles.sheetAction} onPress={a.onPress} accessibilityRole="button">
              {a.icon && <Ionicons name={a.icon} size={20} color={a.destructive ? COLORS.danger : COLORS.textPrimary} />}
              <Text style={[styles.sheetActionText, a.destructive && { color: COLORS.danger }]}>{a.label}</Text>
            </Pressable>
          ))}
          {children}
          <View style={{ marginTop: 10 }}>
            <AppButton title="Cancel" variant="secondary" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOW },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  state: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  stateIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.neutralTint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stateTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  stateText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: RADIUS.md, marginBottom: 14 },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.neutralTint, borderRadius: RADIUS.md, padding: 4, marginBottom: 14 },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: COLORS.card, ...SHADOW, shadowOpacity: 0.05, elevation: 1 },
  segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.textPrimary },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11, color: COLORS.textPrimary },
  stat: { flex: 1, backgroundColor: COLORS.inkSoft, borderRadius: RADIUS.md, padding: 12 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },
  statLabel: { fontSize: 12, color: COLORS.onInkMuted, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: COLORS.neutralTint, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(14,34,56,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, paddingBottom: 28, maxHeight: '85%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  sheetSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2, marginBottom: 8 },
  sheetAction: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sheetActionText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
});
