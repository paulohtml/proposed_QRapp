import { supabase } from './supabase';
import type { Profile, Role } from './types';

export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, id_number, is_active, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function listStudents(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, id_number, is_active')
    .eq('role', 'student')
    .eq('is_active', true)
    .order('full_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function setUserRole(userId: string, role: Role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  return { error: error?.message ?? null };
}

export async function setUserActive(userId: string, isActive: boolean) {
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  return { error: error?.message ?? null };
}

export type SystemReport = {
  users: { student: number; teacher: number; admin: number; inactive: number };
  events: { total: number; open: number; closed: number };
  attendance: { total: number; present: number; late: number; excused: number; absent: number };
  topEvents: { id: string; title: string; count: number }[];
};

export async function getSystemReport(): Promise<SystemReport> {
  const [users, events, att] = await Promise.all([
    supabase.from('profiles').select('role, is_active'),
    supabase.from('events').select('id, title, status, attendance(count)'),
    supabase.from('attendance').select('status'),
  ]);
  if (users.error) throw new Error(users.error.message);
  if (events.error) throw new Error(events.error.message);
  if (att.error) throw new Error(att.error.message);

  const u = { student: 0, teacher: 0, admin: 0, inactive: 0 };
  (users.data ?? []).forEach((r: any) => {
    u[r.role as Role]++;
    if (!r.is_active) u.inactive++;
  });
  const evs = (events.data ?? []) as any[];
  const a = { total: 0, present: 0, late: 0, excused: 0, absent: 0 };
  (att.data ?? []).forEach((r: any) => {
    a.total++;
    a[r.status as 'present']++;
  });
  return {
    users: u,
    events: {
      total: evs.length,
      open: evs.filter((e) => e.status === 'open').length,
      closed: evs.filter((e) => e.status === 'closed').length,
    },
    attendance: a,
    topEvents: evs
      .map((e) => ({ id: e.id, title: e.title, count: e.attendance?.[0]?.count ?? 0 }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 5),
  };
}
