import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import DateTimeField from '@/components/DateTimeField';
import Field from '@/components/Field';
import Screen from '@/components/Screen';
import { AccessDenied, Banner, LoadingState } from '@/components/ui';
import { COLORS, RADIUS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { createEvent, getEvent, updateEvent } from '@/lib/events';
import { validateEvent, type FieldErrors, type EventInput } from '@/lib/validation';

const DURATIONS = [
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '2 hours', ms: 2 * 60 * 60 * 1000 },
  { label: '4 hours', ms: 4 * 60 * 60 * 1000 },
];

function roundedNow() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  return d;
}

export default function EventFormRoute() {
  const { isStaff } = useAuth();
  if (!isStaff) return <AccessDenied message="Only teachers and administrators can manage events." />;
  return <EventForm />;
}

function EventForm() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [loading, setLoading] = useState(editing);
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState(roundedNow);
  const [end, setEnd] = useState(() => new Date(roundedNow().getTime() + 60 * 60 * 1000));
  const [errors, setErrors] = useState<FieldErrors<keyof EventInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getEvent(id)
      .then((e) => {
        if (!e) {
          setFormError('This event no longer exists.');
          return;
        }
        setTitle(e.title);
        setVenue(e.venue ?? '');
        setDescription(e.description ?? '');
        if (e.start_time) setStart(new Date(e.start_time));
        if (e.end_time) setEnd(new Date(e.end_time));
      })
      .catch((e) => setFormError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Event: "Save" pressed -> validate -> insert/update -> open the event (and its QR).
  const handleSave = async () => {
    setFormError(null);
    const input: EventInput = { title, venue, description, start, end };
    const found = validateEvent(input, !editing);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    if (editing) {
      const { error } = await updateEvent(id!, input);
      setSaving(false);
      if (error) return setFormError(error);
      router.back();
    } else {
      const { id: newId, error } = await createEvent(user!.id, input);
      setSaving(false);
      if (error || !newId) return setFormError(error ?? 'Could not create the event.');
      router.replace({ pathname: '/event/[id]', params: { id: newId } });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={editing ? 'Edit event' : 'New event'} subtitle={editing ? undefined : 'A QR code is generated as soon as you save.'} onBack={() => router.back()}>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {formError && <Banner tone="error" message={formError} />}
            <Field label="Event name" value={title} onChangeText={setTitle} placeholder="Founders Day Assembly" error={errors.title} maxLength={100} />
            <Field label="Venue" value={venue} onChangeText={setVenue} placeholder="Gymnasium" error={errors.venue} maxLength={100} />
            <Field label="Description (optional)" value={description} onChangeText={setDescription} placeholder="What students should know" multiline error={errors.description} maxLength={500} hint={`${description.length}/500`} />
            <DateTimeField label="Starts" value={start} onChange={(d) => { setStart(d); if (d >= end) setEnd(new Date(d.getTime() + 60 * 60 * 1000)); }} error={errors.start} />
            <DateTimeField label="Ends" value={end} onChange={setEnd} error={errors.end} />
            <View style={styles.chips}>
              {DURATIONS.map((d) => (
                <Pressable key={d.label} style={styles.chip} onPress={() => setEnd(new Date(start.getTime() + d.ms))}>
                  <Text style={styles.chipText}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>Students scanning more than 15 minutes after the start are marked late. Check-in opens 15 minutes before the start.</Text>
            <AppButton title={editing ? 'Save changes' : 'Create event'} icon={editing ? 'save-outline' : 'add-circle-outline'} onPress={handleSave} loading={saving} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4, marginBottom: 12 },
  chip: { backgroundColor: COLORS.primaryTint, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  hint: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 18 },
});
