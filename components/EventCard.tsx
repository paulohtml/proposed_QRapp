import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { eventWhen } from '@/lib/format';
import type { EventRow } from '@/lib/types';
import { Card, EventStatusBadge } from './ui';

type Props = {
  event: EventRow;
  onPress?: () => void;
  showCount?: boolean;
  showCreator?: boolean;
};

export default function EventCard({ event, onPress, showCount, showCreator }: Props) {
  const count = event.attendance?.[0]?.count ?? 0;
  return (
    <Card onPress={onPress}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <EventStatusBadge event={event} />
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={15} color={COLORS.textSecondary} />
        <Text style={styles.meta}>{eventWhen(event)}</Text>
      </View>
      {event.venue ? (
        <View style={styles.row}>
          <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.meta} numberOfLines={1}>{event.venue}</Text>
        </View>
      ) : null}
      {(showCount || showCreator) && (
        <View style={styles.footer}>
          {showCount ? (
            <View style={styles.row}>
              <Ionicons name="people-outline" size={15} color={COLORS.primary} />
              <Text style={[styles.meta, { color: COLORS.primary, fontWeight: '700' }]}>{count} checked in</Text>
            </View>
          ) : <View />}
          {showCreator && event.creator ? (
            <Text style={styles.creator} numberOfLines={1}>by {event.creator.full_name || event.creator.email}</Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: 14, color: COLORS.textSecondary, flexShrink: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  creator: { fontSize: 12, color: COLORS.textMuted, flexShrink: 1 },
});
