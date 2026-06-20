"use client";

import { useEffect } from "react";
import { motionDelayMs } from "@/lib/motion";

type StreakBadgePopProps = {
  streakDays: number;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 2000;

export function StreakBadgePop({ streakDays, onDismiss }: StreakBadgePopProps) {
  useEffect(() => {
    const delay = motionDelayMs(0, AUTO_DISMISS_MS);
    if (delay === 0) {
      onDismiss();
      return;
    }

    const timer = window.setTimeout(onDismiss, delay);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="tv-streak-badge-pop pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center"
      onClick={onDismiss}
      role="presentation"
    >
      <div className="tv-streak-badge-pop-badge flex size-16 items-center justify-center rounded-full bg-[var(--color-accent)] shadow-[0_8px_24px_rgba(var(--gold-rgb),0.35)]">
        <span className="tv-tabular text-[22px] font-bold text-[var(--color-on-accent)]">
          {streakDays}
        </span>
      </div>
      <p className="tv-streak-badge-pop-label mt-2 text-[14px] font-semibold text-[var(--color-accent)]">
        {streakDays} day streak!
      </p>
    </div>
  );
}
