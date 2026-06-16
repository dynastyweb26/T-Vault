"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { RouteGuardLoading } from "@/components/shell/route-guard-loading";
import { APP_ROUTES } from "@/lib/constants";
import { hasCompletedOnboarding } from "@/lib/auth-helpers";

interface RouteGuardProps {
  children: React.ReactNode;
  mode?: "app" | "auth";
}

export function RouteGuard({ children, mode = "auth" }: RouteGuardProps) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

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
