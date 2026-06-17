"use client";

import { useCallback, useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { useAppTour } from "@/components/providers/app-tour-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

const HINT_DISMISS_MS = 4500;
const HINT_STORAGE_PREFIX = "tv-tour-hint-seen:";

function hintStorageKey(userId: string): string {
  return `${HINT_STORAGE_PREFIX}${userId}`;
}

export function TourFab() {
  const { user } = useAuth();
  const { startTour, isRunning } = useAppTour();
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!user || isRunning) {
      setShowHint(false);
      return;
    }

    const seen = sessionStorage.getItem(hintStorageKey(user.id));
    if (seen) return;

    setShowHint(true);
    const timer = window.setTimeout(() => {
      setShowHint(false);
      sessionStorage.setItem(hintStorageKey(user.id), "1");
    }, HINT_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [isRunning, user]);

  const dismissHint = useCallback(() => {
    if (!user) return;
    setShowHint(false);
    sessionStorage.setItem(hintStorageKey(user.id), "1");
  }, [user]);

  const handleStartTour = useCallback(() => {
    dismissHint();
    triggerHaptic("light");
    void startTour();
  }, [dismissHint, startTour]);

  if (!user || isRunning) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[45] mx-auto max-w-lg"
      aria-hidden={false}
    >
      <div className="relative px-2">
        {showHint ? (
          <div
            className="pointer-events-auto absolute bottom-[calc(100%+0.5rem)] left-[28%] z-10 max-w-[9.5rem] -translate-x-1/2 rounded-xl border border-[var(--color-accent)]/35 bg-[var(--color-surface)] px-3 py-2 text-center text-[12px] font-medium leading-snug text-[var(--color-text-primary)] shadow-[var(--shadow-gold-strong)]"
            role="tooltip"
          >
            Tap to start tour
            <span
              className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-[var(--color-accent)]/35 bg-[var(--color-surface)]"
              aria-hidden
            />
          </div>
        ) : null}

        <button
          type="button"
          aria-label="Start app tour"
          title="How T-Vault Works"
          data-tour-trigger
          onClick={handleStartTour}
          className={cn(
            "pointer-events-auto tv-pressable absolute left-[28%] flex size-11 -translate-x-1/2 items-center justify-center rounded-full",
            "border-2 border-[var(--color-accent)] bg-[var(--color-surface-elevated)]",
            "shadow-[0_0_0_1px_var(--color-accent)_inset,0_4px_14px_rgba(0,0,0,0.25)]",
            "text-[var(--color-accent)] transition-transform active:scale-95"
          )}
        >
          <Compass className="size-5" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}
