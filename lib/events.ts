import { supabase } from './supabase';
import type { EventRow, EventStatus } from './types';

const EVENT_COLUMNS =
  'id, event_code, title, description, venue, start_time, end_time, status, late_after_minutes, created_by, created_at, creator:profiles!events_created_by_fkey(full_name, email), attendance(count)';

export type EventFormValues = {
  title: string;
  description: string;
  venue: string;
  start: Date;
  end: Date;
};

/** Staff: events they own (admins: every event). Students: everything readable. */
export async function listEvents(opts: { ownerId?: string } = {}): Promise<EventRow[]> {
  let q = supabase.from('events').select(EVENT_COLUMNS).order('start_time', { ascending: false });
  if (opts.ownerId) q = q.eq('created_by', opts.ownerId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EventRow[];
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const { data, error } = await supabase.from('events').select(EVENT_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as EventRow) ?? null;
}

export async function createEvent(userId: string, v: EventFormValues): Promise<{ id?: string; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: v.title.trim(),
      description: v.description.trim() || null,
      venue: v.venue.trim(),
      start_time: v.start.toISOString(),
      end_time: v.end.toISOString(),
      status: 'open',
      created_by: userId,
    })
    .select('id')
    .single();
  return { id: data?.id, error: error?.message ?? null };
}

export async function updateEvent(id: string, v: EventFormValues): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({
      title: v.title.trim(),
      description: v.description.trim() || null,
      venue: v.venue.trim(),
      start_time: v.start.toISOString(),
      end_time: v.end.toISOString(),
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function setEventStatus(id: string, status: EventStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.from('events').delete().eq('id', id).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'This event already has attendance records, so only an administrator can delete it.' };
  }
  return { error: null };
}

/** Only the owner / admin can read this (enforced by RLS). */
export async function getEventToken(eventId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('event_qr_tokens')
    .select('token')
    .eq('event_id', eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.token ?? null;
}

export async function rotateEventToken(eventId: string): Promise<{ token?: string; error: string | null }> {
  const { data, error } = await supabase.rpc('rotate_event_token', { p_event: eventId });
  return { token: data as string | undefined, error: error?.message ?? null };
}
