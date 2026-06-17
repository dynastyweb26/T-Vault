"use client";

import { X } from "lucide-react";
import type { TooltipRenderProps } from "react-joyride";
import { TOUR_STEP_COUNT } from "@/lib/tour/constants";

export function TourTooltip({
  continuous,
  index,
  isLastStep,
  step,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="tv-tour-tooltip w-[min(calc(100vw-2.5rem),22rem)] rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-gold-strong)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="tv-caption text-[var(--color-accent)]">
          Step {index + 1} of {TOUR_STEP_COUNT}
        </p>
        <button
          {...closeProps}
          type="button"
          className="tv-icon-btn -mr-1 -mt-1 shrink-0 rounded-full text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          aria-label="Close tour"
        >
          <X className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <p className="tv-body text-[15px] leading-relaxed text-[var(--color-text-primary)]">
        {step.content}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          {...skipProps}
          type="button"
          className="tv-body min-h-11 px-1 text-[14px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
        >
          Skip tour
        </button>

        {continuous ? (
          <button
            {...primaryProps}
            type="button"
            className="tv-brushed-gold-btn h-11 min-w-[5.5rem] rounded-xl px-5 text-[15px] font-semibold text-[var(--color-on-accent)]"
          >
            {isLastStep ? "Done" : "Next"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
