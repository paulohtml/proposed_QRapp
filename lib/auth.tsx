import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getProfile } from './profiles';
import { supabase } from './supabase';
import type { Profile, Role } from './types';
import { friendlyAuthError } from './validation';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role;
  isStaff: boolean;
  isAdmin: boolean;
  loading: boolean;
  notice: string | null;
  clearNotice: () => void;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    idNumber?: string;
  }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const forceSignOut = useCallback(async (message: string | null) => {
    setSession(null);
    setProfile(null);
    if (message) setNotice(message);
    try {
      await supabase.auth.signOut();
    } catch {
      /* local state is already cleared */
    }
  }, []);

  // Event: app starts / auth state changes -> restore, refresh or clear the session.
  useEffect(() => {
    let mounted = true;

    const applySession = async (next: Session | null) => {
      if (!mounted) return;
      if (!next) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const p = await getProfile(next.user.id).catch(() => null);
      if (!mounted) return;
      if (p && !p.is_active) {
        await forceSignOut('Your account has been deactivated. Contact an administrator.');
      } else {
        setSession(next);
        setProfile(p);
      }
      setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => applySession(null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') {
        applySession(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // defer: never await supabase calls inside this callback
        setTimeout(() => applySession(next), 0);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [forceSignOut]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const p = await getProfile(session.user.id).catch(() => null);
    if (p) setProfile(p);
  }, [session]);

  const signIn: AuthContextValue['signIn'] = useCallback(async (email, password) => {
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? friendlyAuthError(error.message) : null };
  }, []);

  const signUp: AuthContextValue['signUp'] = useCallback(async ({ email, password, fullName, idNumber }) => {
    setNotice(null);
    // Name and ID travel as sign-up metadata; the database trigger builds the profile.
    // The role is NEVER sent by the client: every new account starts as a student.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, id_number: idNumber ?? '' } },
    });
    if (error) return { error: friendlyAuthError(error.message), needsConfirmation: false };
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    // Clear local state first so the UI leaves protected screens immediately.
    setSession(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch {
      /* token is dropped locally either way */
    }
  }, []);

  const role: Role = profile?.role ?? 'student'; // least privilege if profile is unavailable

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      isStaff: role === 'teacher' || role === 'admin',
      isAdmin: role === 'admin',
      loading,
      notice,
      clearNotice: () => setNotice(null),
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }),
    [session, profile, role, loading, notice, refreshProfile, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
