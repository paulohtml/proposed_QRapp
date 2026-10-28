import type { RealtimeChannel } from '@supabase/supabase-js';

import { parseQRPayload } from './qr';
import { supabase } from './supabase';
import type { AttendanceRow, AttendanceStatus, ScanCode, ScanResult } from './types';

const ATT_WITH_STUDENT =
  'id, student_id, event_id, scanned_at, status, note, student:profiles!attendance_student_id_fkey(full_name, email, id_number), event:events(title, venue, start_time)';

/**
 * Scan flow: parse QR locally -> ask the server to validate + record.
 * All real rules (event exists, open, in time window, no duplicate,
 * caller is a student) are enforced in the database function record_attendance().
 */
export async function recordAttendance(rawPayload: string): Promise<ScanResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) return { ok: false, code: 'invalid_qr', message: parsed.message };

  const { data, error } = await supabase.rpc('record_attendance', { p_token: parsed.token });
  if (error) {
    return { ok: false, code: 'error', message: 'Could not reach the server. Check your connection and scan again.' };
  }
  const r = data as any;
  return {
    ok: !!r.ok,
    code: (r.code ?? 'error') as ScanCode,
    message: r.message ?? 'Unexpected response.',
    eventTitle: r.event_title,
    venue: r.venue,
    scannedAt: r.scanned_at,
    status: r.status as AttendanceStatus | undefined,
  };
}

/** The signed-in student's own history (RLS also restricts this to their rows). */
export async function getMyAttendance(studentId: string): Promise<AttendanceRow[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, student_id, event_id, scanned_at, status, note, event:events(title, venue, start_time)')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AttendanceRow[];
}

export async function getEventAttendance(eventId: string): Promise<AttendanceRow[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select(ATT_WITH_STUDENT)
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AttendanceRow[];
}

/** Staff: every record they are allowed to see (teachers: own events, admins: all). */
export async function getAllAttendance(limit = 300): Promise<AttendanceRow[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select(ATT_WITH_STUDENT)
    .order('scanned_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AttendanceRow[];
}

// ---- Admin corrections (RLS allows these for admins only) -------------------
export async function setAttendanceStatus(id: string, status: AttendanceStatus) {
  const { error } = await supabase.from('attendance').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function removeAttendance(id: string) {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function addAttendanceManually(eventId: string, studentId: string, adminId: string, status: AttendanceStatus) {
  const { error } = await supabase
    .from('attendance')
    .insert({ event_id: eventId, student_id: studentId, status, recorded_by: adminId, note: 'Added by administrator' });
  if (error?.code === '23505') return { error: 'That student is already recorded for this event.' };
  return { error: error?.message ?? null };
}

/** Real-time: fires whenever a student checks in (or a record changes) for this event. */
export function subscribeToEventAttendance(eventId: string, onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`attendance:${eventId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `event_id=eq.${eventId}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
