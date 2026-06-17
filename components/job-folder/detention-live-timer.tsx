"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import {
  formatTimerDisplay,
  getDetentionElapsedSeconds,
  normalizeTimerStart,
} from "@/lib/job-folder/detention";

interface DetentionLiveTimerProps {
  timerStart: string;
  locationLabel: string;
  onStop: () => void;
}

export function DetentionLiveTimer({
  timerStart,
  locationLabel,
  onStop,
}: DetentionLiveTimerProps) {
  const timerStartRef = useRef(normalizeTimerStart(timerStart));
  timerStartRef.current = normalizeTimerStart(timerStart);

  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    getDetentionElapsedSeconds(timerStartRef.current)
  );

  useEffect(() => {
    const update = () => {
      setElapsedSeconds(getDetentionElapsedSeconds(timerStartRef.current));
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [timerStart]);

  return (
    <div className="mt-4 rounded-2xl tv-glass-card border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] p-5 text-center">
      <Clock
        className="mx-auto size-7 animate-spin text-[var(--color-success)]"
        style={{ animationDuration: "4s" }}
        strokeWidth={2}
      />
      <p className="tv-tabular mt-3 text-[40px] font-bold">
        {formatTimerDisplay(elapsedSeconds)}
      </p>
      <p className="text-[14px] text-[var(--color-text-secondary)]">
        At {locationLabel}
      </p>
      <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
        Free time: 2 hours. After that, you&apos;re owed money.
      </p>
      <TvButton
        variant="secondary"
        className="mt-4 border-[var(--color-danger)] text-[var(--color-danger-text)]"
        onClick={onStop}
      >
        Stop Timer
      </TvButton>
    </div>
  );
}
