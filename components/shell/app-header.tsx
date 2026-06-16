"use client";

import { DataProtectionBanner } from "@/components/shell/session-banner";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showDataProtection?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showDataProtection = false,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <div>
          <p className="tv-caption">T-Vault</p>
          <h1 className="tv-page-title">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {showDataProtection ? <DataProtectionBanner /> : null}
      </div>
    </header>
  );
}
