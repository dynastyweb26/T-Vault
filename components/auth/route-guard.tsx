"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
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

    if (
      mode === "app" &&
      profile &&
      !hasCompletedOnboarding(profile, user.id)
    ) {
      router.replace(APP_ROUTES.onboarding);
    }
  }, [loading, mode, profile, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)]">
        <div className="tv-skeleton h-12 w-48 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!user) return null;

  if (
    mode === "app" &&
    profile &&
    !hasCompletedOnboarding(profile, user.id)
  ) {
    return null;
  }

  return <>{children}</>;
}
