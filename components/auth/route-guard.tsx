"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { RouteGuardLoading } from "@/components/shell/route-guard-loading";
import { APP_ROUTES } from "@/lib/constants";
import { hasCompletedOnboarding } from "@/lib/auth-helpers";
import {
  clearSplashNavigation,
  hasPendingSplashNavigation,
} from "@/lib/splash-flow";

interface RouteGuardProps {
  children: React.ReactNode;
  mode?: "app" | "auth";
}

function SplashTransitionHold() {
  return (
    <div
      className="min-h-dvh"
      style={{ backgroundColor: "#0a0a0a" }}
      aria-hidden
    />
  );
}

// UX-only guard — middleware enforces auth, profile, and onboarding server-side.
export function RouteGuard({ children, mode = "auth" }: RouteGuardProps) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [fromSplash, setFromSplash] = useState(false);

  useEffect(() => {
    setFromSplash(hasPendingSplashNavigation());
  }, []);

  useEffect(() => {
    if (!loading && fromSplash) {
      clearSplashNavigation();
      setFromSplash(false);
    }
  }, [fromSplash, loading]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    if (mode === "app") {
      if (!profile) {
        router.replace(APP_ROUTES.splash);
        return;
      }

      if (!hasCompletedOnboarding(profile)) {
        router.replace(APP_ROUTES.onboarding);
      }
    }
  }, [loading, mode, profile, router, user]);

  if (loading) {
    if (mode === "app" && (fromSplash || hasPendingSplashNavigation())) {
      return <SplashTransitionHold />;
    }
    return <RouteGuardLoading />;
  }

  if (!user) return null;

  if (mode === "app") {
    if (!profile || !hasCompletedOnboarding(profile)) {
      return null;
    }
  }

  return <>{children}</>;
}
