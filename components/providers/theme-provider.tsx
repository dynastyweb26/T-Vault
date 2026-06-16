"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import type { ThemePreference } from "@/types/database";

type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);
  const { user, profile } = useAuth();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [theme, setTheme] = useState<ResolvedTheme>("dark");

  const applyTheme = useCallback((nextTheme: ResolvedTheme) => {
    setTheme(nextTheme);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("tvault_theme") as ThemePreference | null;
    if (stored) {
      setPreferenceState(stored);
    }
  }, []);

  useEffect(() => {
    const profilePreference = profile?.theme_preference;
    if (profilePreference && profilePreference !== "system") {
      setPreferenceState(profilePreference);
      localStorage.setItem("tvault_theme", profilePreference);
      return;
    }

    if (!user) {
      const resolved =
        preference === "system" ? getSystemTheme() : preference;
      applyTheme(resolved);
      return;
    }

    if (preference === "system") {
      applyTheme(getSystemTheme());
      return;
    }

    applyTheme(preference);
  }, [applyTheme, preference, profile?.theme_preference, user]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (preference === "system" && !profile?.theme_preference) {
        applyTheme(getSystemTheme());
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [applyTheme, preference, profile?.theme_preference]);

  const setPreference = useCallback(
    async (nextPreference: ThemePreference) => {
      setPreferenceState(nextPreference);
      localStorage.setItem("tvault_theme", nextPreference);

      const resolved =
        nextPreference === "system" ? getSystemTheme() : nextPreference;
      applyTheme(resolved);

      if (user && supabase) {
        await supabase
          .from("users")
          .update({ theme_preference: nextPreference })
          .eq("id", user.id);
      }
    },
    [applyTheme, supabase, user]
  );

  const value = useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference, setPreference]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
