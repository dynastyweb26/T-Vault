"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  offline: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  patchProfile: (updates: Partial<UserProfile>) => void;
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
  const [offline, setOffline] = useState(false);
  const profileFetchGeneration = useRef(0);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user || !supabase) {
      setProfile(null);
      return null;
    }

    const fetchGeneration = profileFetchGeneration.current + 1;
    profileFetchGeneration.current = fetchGeneration;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchGeneration !== profileFetchGeneration.current) {
      console.info("[auth] refreshProfile ignored stale response", {
        userId: user.id,
        fetchGeneration,
        currentGeneration: profileFetchGeneration.current,
      });
      return null;
    }

    if (error) {
      console.error("[auth] refreshProfile failed:", error.message);
      return null;
    }

    if (!data) {
      console.warn("[auth] refreshProfile: no users row for", user.id);
      return null;
    }

    const nextProfile = data as UserProfile;
    let appliedProfile = nextProfile;
    console.info("[auth] refreshProfile applied", {
      userId: user.id,
      onboarding_completed: nextProfile.onboarding_completed,
      profile_setup_completed: nextProfile.profile_setup_completed,
      profile_setup_skipped: nextProfile.profile_setup_skipped,
    });
    setProfile((current) => {
      if (
        current?.has_dismissed_tour_hint === true &&
        nextProfile.has_dismissed_tour_hint !== true
      ) {
        appliedProfile = { ...nextProfile, has_dismissed_tour_hint: true };
        return appliedProfile;
      }
      return nextProfile;
    });
    return appliedProfile;
  }, [supabase, user]);

  const patchProfile = useCallback((updates: Partial<UserProfile>) => {
    profileFetchGeneration.current += 1;
    console.info("[auth] patchProfile", {
      updates,
      generation: profileFetchGeneration.current,
    });
    setProfile((current) => {
      if (current) {
        return { ...current, ...updates };
      }
      if (updates.id) {
        return updates as UserProfile;
      }
      return null;
    });
  }, []);

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
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error && !navigator.onLine) {
        const {
          data: { session: cachedSession },
        } = await supabase.auth.getSession();
        if (cachedSession?.user) {
          setSession(cachedSession);
          setUser(cachedSession.user);
          setOffline(true);
          setSessionWarning(true);
          setLoading(false);
          return;
        }
      }

      if (error && navigator.onLine) {
        setSessionWarning(true);
      }

      if (currentUser) {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentUser);
      } else {
        setSession(null);
        setUser(null);
      }

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

    const handleOnline = () => {
      setOffline(false);
      setSessionWarning(false);
    };
    const handleOffline = () => {
      setOffline(true);
      setSessionWarning(true);
    };

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
      offline,
      refreshProfile,
      patchProfile,
      recordActivity,
      signOut,
    }),
    [
      session,
      user,
      profile,
      loading,
      sessionWarning,
      offline,
      refreshProfile,
      patchProfile,
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
