"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { useAuth } from "@/components/providers/auth-provider";
import { APP_ROUTES } from "@/lib/constants";
import { getPostAuthRedirect } from "@/lib/auth-helpers";

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

    if (!profile) return;

    const destination = getPostAuthRedirect(profile);

    if (mode === "app" && destination !== APP_ROUTES.dashboard) {
      router.replace(destination);
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

  if (mode === "app" && profile) {
    const destination = getPostAuthRedirect(profile);
    if (destination !== APP_ROUTES.dashboard) return null;
  }

  return <>{children}</>;
}
