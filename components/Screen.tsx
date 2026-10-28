import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, RADIUS } from '@/constants/colors';

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
  /** Extra content inside the dark header (stats, filters). */
  headerExtra?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: object;
};

/** Every tab uses this: dark ink header, light scrolling body. Consistent + mobile-friendly. */
export default function Screen({
  title,
  subtitle,
  right,
  onBack,
  children,
  headerExtra,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {headerExtra}
      </View>
      {scroll ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, styles.content, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.onInkMuted, marginTop: 4, lineHeight: 20 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.inkSoft, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
});
