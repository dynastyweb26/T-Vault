"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { BottomNavContainer } from "@/components/shell/bottom-nav";
import { SessionBanner } from "@/components/shell/session-banner";
import { VaultHeader } from "@/components/shell/vault-header";
import { OfflineBanner } from "@/components/offline/offline-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sessionWarning, offline, recordActivity, user } = useAuth();

  useEffect(() => {
    if (user) {
      recordActivity();
    }
  }, [recordActivity, user]);

  return (
    <div className="tv-page-canvas flex min-h-dvh flex-col">
      <OfflineBanner />
      {sessionWarning ? <SessionBanner offline={offline} /> : null}
      <VaultHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-0 pb-32">
        {children}
      </main>
      <BottomNavContainer />
    </div>
  );
}
