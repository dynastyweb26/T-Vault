"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { updateStreak } from "@/lib/streak";
import type { UserProfile } from "@/types/database";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  sessionWarning: boolean;
  refreshProfile: () => Promise<void>;
  recordActivity: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!user || !supabase) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile(data as UserProfile);
    }
  }, [supabase, user]);

  const recordActivity = useCallback(async () => {
    if (!user || !supabase) return;
    await updateStreak(supabase, user.id);
    await refreshProfile();
  }, [refreshProfile, supabase, user]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error && !navigator.onLine) {
        setSessionWarning(true);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === "TOKEN_REFRESHED") {
        setSessionWarning(false);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    const handleOnline = () => setSessionWarning(false);
    const handleOffline = () => setSessionWarning(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    refreshProfile();
  }, [refreshProfile, user]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      sessionWarning,
      refreshProfile,
      recordActivity,
      signOut,
    }),
    [
      session,
      user,
      profile,
      loading,
      sessionWarning,
      refreshProfile,
      recordActivity,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
