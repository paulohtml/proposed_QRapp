import type { AttendanceStatus, EventRow } from './types';

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '-';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function eventWhen(e: Pick<EventRow, 'start_time' | 'end_time'>): string {
  if (!e.start_time) return 'No schedule';
  const end = e.end_time ? ` - ${formatTime(e.end_time)}` : '';
  return `${formatDate(e.start_time)}, ${formatTime(e.start_time)}${end}`;
}

export type EffectiveStatus = 'upcoming' | 'live' | 'ended' | 'closed';

/** Combines the stored status with the clock so the UI never shows a stale "open". */
export function effectiveStatus(e: Pick<EventRow, 'status' | 'start_time' | 'end_time'>): EffectiveStatus {
  if (e.status === 'closed') return 'closed';
  const now = Date.now();
  if (e.end_time && now > new Date(e.end_time).getTime()) return 'ended';
  if (e.start_time && now < new Date(e.start_time).getTime() - 15 * 60 * 1000) return 'upcoming';
  return 'live';
}

export function isAcceptingAttendance(e: Pick<EventRow, 'status' | 'start_time' | 'end_time'>) {
  const s = effectiveStatus(e);
  return s === 'live' || s === 'upcoming';
}

export function initials(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback;
}

export function displayName(p: { full_name: string | null; email: string } | null | undefined): string {
  return p?.full_name?.trim() || p?.email || 'Unknown';
}

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  excused: 'Excused',
  absent: 'Absent',
};

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
