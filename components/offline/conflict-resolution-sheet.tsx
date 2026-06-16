"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
import { getConflict, setConflict, type ConflictData } from "@/lib/offline/queue";

export function ConflictResolutionSheet() {
  const [conflict, setConflictState] = useState<ConflictData | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const existing = getConflict();
    if (existing) setConflictState(existing);

    const timer = setTimeout(() => {
      if (getConflict()) {
        setTimedOut(true);
        setConflict(null);
        setConflictState(null);
      }
    }, 10_000);

    return () => clearTimeout(timer);
  }, []);

  if (!conflict) return null;

  const serverTime = new Date(conflict.serverUpdatedAt).toLocaleString();
  const localTime = new Date(conflict.localUpdatedAt).toLocaleString();

  return (
    <BottomSheet
      open
      onClose={() => {
        setConflict(null);
        setConflictState(null);
      }}
      title="Sync conflict"
      ariaLabel="Resolve sync conflict"
      surface="solid"
    >
      <p className="tv-body text-[16px]">
        This job was updated on another device.
      </p>
      {timedOut ? (
        <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
          Using newer server version (timeout).
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <TvButton
            onClick={() => {
              setConflict(null);
              setConflictState(null);
            }}
          >
            Keep my changes
          </TvButton>
          <TvButton
            variant="secondary"
            onClick={() => {
              setConflict(null);
              setConflictState(null);
            }}
          >
            Use newer version ({serverTime})
          </TvButton>
          <p className="text-center text-[14px] text-[var(--color-text-muted)]">
            Your version: {localTime}
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
