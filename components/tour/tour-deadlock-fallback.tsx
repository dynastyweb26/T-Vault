"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Controls } from "react-joyride";
import {
  TOUR_STEP_COUNT,
  type TourTargetId,
} from "@/lib/tour/constants";
import type { TourFallbackPosition } from "@/lib/tour/deadlock-escape";

interface TourDeadlockFallbackProps {
  index: number;
  targetId: TourTargetId;
  content: string;
  position: TourFallbackPosition;
  isLastStep: boolean;
  controls: Controls;
  onDismiss: () => void;
}

export function TourDeadlockFallback({
  index,
  content,
  position,
  isLastStep,
  controls,
  onDismiss,
}: TourDeadlockFallbackProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="tv-tour-deadlock-fallback fixed z-[102] rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-surface)] px-5 pb-5 pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.625rem))] shadow-[var(--shadow-gold-strong)]"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      role="dialog"
      aria-label={`Tour step ${index + 1}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="tv-caption text-[var(--color-accent)]">
          Step {index + 1} of {TOUR_STEP_COUNT}
        </p>
        <button
          type="button"
          className="tv-icon-btn -mr-1 shrink-0 rounded-full text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] min-h-14 min-w-14"
          aria-label="Close tour"
          onClick={() => {
            onDismiss();
            controls.close("button_close");
          }}
        >
          <X className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <p className="tv-body text-[15px] leading-relaxed text-[var(--color-text-primary)]">
        {content}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          className="tv-body flex min-h-14 min-w-14 items-center px-2 text-[14px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
          onClick={() => {
            onDismiss();
            controls.skip("button_skip");
          }}
        >
          Skip tour
        </button>
        <button
          type="button"
          className="tv-brushed-gold-btn flex min-h-14 min-w-14 items-center justify-center rounded-xl px-5 text-[15px] font-semibold text-[var(--color-on-accent)]"
          onClick={() => {
            onDismiss();
            if (isLastStep) controls.close("button_primary");
            else controls.next("button_primary");
          }}
        >
          {isLastStep ? "Done" : "Next"}
        </button>
      </div>
    </div>,
    document.body
  );
}
