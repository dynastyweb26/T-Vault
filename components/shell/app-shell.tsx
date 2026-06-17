"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { BottomNav } from "@/components/shell/bottom-nav";
import { SessionBanner } from "@/components/shell/session-banner";
import { VaultHeader } from "@/components/shell/vault-header";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { ConflictResolutionSheet } from "@/components/offline/conflict-resolution-sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sessionWarning, offline, recordActivity, user } = useAuth();

  useEffect(() => {
    if (user) {
      recordActivity();
    }
  }, [recordActivity, user]);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <OfflineBanner />
      {sessionWarning ? <SessionBanner offline={offline} /> : null}
      <VaultHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-0 pb-32">
        {children}
      </main>
      <BottomNav />
      <ConflictResolutionSheet />
    </div>
  );
}
