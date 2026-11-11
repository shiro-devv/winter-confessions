import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchProfile,
  logIn,
  logOut,
  signUp,
  updateProfile,
  type Profile,
} from '../services/auth';

interface AuthValue {
  user: Profile | null;
  /** True until the first Supabase session check finishes. */
  loading: boolean;
  signUp: typeof signUp;
  logIn: typeof logIn;
  logOut: typeof logOut;
  updateProfile: typeof updateProfile;
  /** Re-reads the current session and profile after an auth change. */
  refresh: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setLoading(false);
    });

    // Keep every tab in sync and react to the confirmation redirect.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setUser(null);
      return;
    }

    fetchProfile(userId)
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) setUser(null);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id ?? null;
    setUserId(id);
    if (!id) {
      setUser(null);
      return null;
    }
    const profile = await fetchProfile(id);
    setUser(profile);
    return profile;
  }, []);

  const saveProfile = useCallback<typeof updateProfile>(async (id, patch) => {
    const updated = await updateProfile(id, patch);
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, signUp, logIn, logOut, updateProfile: saveProfile, refresh }),
    [user, loading, saveProfile, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
