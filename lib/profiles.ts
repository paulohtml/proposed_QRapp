import { supabase } from './supabase';
import type { Profile } from './types';

export type { Role, Profile } from './types';

const COLUMNS = 'id, email, full_name, role, id_number, is_active, created_at';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? null;
}

// Role / active status are intentionally NOT editable here: the database blocks it.
export async function updateProfile(
  userId: string,
  updates: { full_name?: string; id_number?: string | null }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  return { error: error?.message ?? null };
}
