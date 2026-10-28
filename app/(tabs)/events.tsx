import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import EventCard from '@/components/EventCard';
import Screen from '@/components/Screen';
import { Banner, EmptyState, ErrorState, LoadingState, SearchBar, Segmented } from '@/components/ui';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { listEvents } from '@/lib/events';
import { effectiveStatus, isAcceptingAttendance } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';

type Filter = 'available' | 'past' | 'all' | 'open' | 'closed';

export default function EventsScreen() {
  const { user, role, isStaff } = useAuth();
  const [filter, setFilter] = useState<Filter>(isStaff ? 'all' : 'available');
  const [search, setSearch] = useState('');

  const q = useQuery(
    () => listEvents(role === 'teacher' ? { ownerId: user!.id } : {}),
    [user?.id, role]
  );

  const shown = useMemo(() => {
    const list = q.data ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((e) => {
      if (term && !`${e.title} ${e.venue ?? ''}`.toLowerCase().includes(term)) return false;
      if (filter === 'available' || filter === 'open') return isAcceptingAttendance(e);
      if (filter === 'past') return !isAcceptingAttendance(e);
      if (filter === 'closed') return effectiveStatus(e) === 'closed' || effectiveStatus(e) === 'ended';
      return true;
    });
  }, [q.data, filter, search]);

  return (
    <Screen
      title="Events"
      subtitle={isStaff ? (role === 'admin' ? 'All school events' : 'Events you manage') : 'Events you can check in to'}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      right={
        isStaff ? (
          <Pressable style={styles.add} onPress={() => router.push('/event/form')} accessibilityRole="button" accessibilityLabel="New event">
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        ) : undefined
      }
    >
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by title or venue" />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={
          isStaff
            ? [{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]
            : [{ value: 'available', label: 'Available' }, { value: 'past', label: 'Past' }]
        }
      />
      {!isStaff && filter === 'available' && (
        <Banner tone="info" message="To check in, scan the QR code shown at the venue." />
      )}

      {q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          title={search ? 'No matching events' : 'No events here yet'}
          message={isStaff && !search ? 'Create your first event to generate a QR code.' : undefined}
          action={isStaff && !search ? <AppButton title="Create event" icon="add-circle-outline" onPress={() => router.push('/event/form')} /> : undefined}
        />
      ) : (
        shown.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            showCount={isStaff}
            showCreator={role === 'admin'}
            onPress={isStaff ? () => router.push({ pathname: '/event/[id]', params: { id: e.id } }) : undefined}
          />
        ))
      )}
      {!q.loading && !q.error && shown.length > 0 && <Text style={styles.count}>{shown.length} event{shown.length === 1 ? '' : 's'}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  add: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  count: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
});
