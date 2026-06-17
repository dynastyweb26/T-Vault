"use client";

import { useCallback, useRef, useState } from "react";
import { Compass, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export function TourHintBanner() {
  const { profile, patchProfile } = useAuth();
  const [optimisticallyDismissed, setOptimisticallyDismissed] = useState(false);
  const dismissingRef = useRef(false);

  const showBanner =
    !optimisticallyDismissed &&
    profile != null &&
    profile.has_dismissed_tour_hint !== true;

  const dismiss = useCallback(async () => {
    if (dismissingRef.current || !profile) return;

    dismissingRef.current = true;
    setOptimisticallyDismissed(true);
    patchProfile({ has_dismissed_tour_hint: true });

    try {
      const response = await fetch("/api/profile/dismiss-tour-hint", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("dismiss_failed");
      }
    } catch {
      setOptimisticallyDismissed(false);
      patchProfile({ has_dismissed_tour_hint: false });
      dismissingRef.current = false;
    }
  }, [patchProfile, profile]);

  if (!showBanner) return null;

  return (
    <div
      role="status"
      className="tv-tour-hint-banner tv-glass-card mb-3 flex cursor-pointer items-start gap-3 rounded-2xl border-[var(--color-accent)]/25 px-4 py-3.5 shadow-[var(--shadow-gold)]"
      onClick={() => void dismiss()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void dismiss();
        }
      }}
      tabIndex={0}
      aria-label="Dismiss tour hint: New here? Find the full App Tour in your Profile."
    >
      <Compass
        className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]"
        strokeWidth={2}
        aria-hidden
      />
      <p className="flex-1 text-[14px] leading-5 text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text-primary)]">
          New here?
        </span>{" "}
        Find the full App Tour in your Profile.
      </p>
      <button
        type="button"
        className="tv-icon-btn -mr-1 -mt-1 shrink-0 rounded-full text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
        aria-label="Dismiss tour hint"
        onClick={(event) => {
          event.stopPropagation();
          void dismiss();
        }}
      >
        <X className="size-5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
