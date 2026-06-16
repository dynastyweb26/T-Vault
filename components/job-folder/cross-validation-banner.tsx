"use client";

import { AlertTriangle } from "lucide-react";
import type { CrossValidationConflict } from "@/lib/job-folder/ai-types";

interface CrossValidationBannerProps {
  conflicts: CrossValidationConflict[];
  onResolve: (conflict: CrossValidationConflict, source: "rate_con" | "bol") => void;
}

const fieldLabels: Record<CrossValidationConflict["field"], string> = {
  pickup_location: "Pickup Location",
  delivery_location: "Delivery Location",
};

export function CrossValidationBanner({
  conflicts,
  onResolve,
}: CrossValidationBannerProps) {
  if (!conflicts.length) return null;

  return (
    <div className="mt-3 space-y-3">
      {conflicts.map((conflict) => (
        <div
          key={conflict.field}
          role="alert"
          className="rounded-2xl border border-[var(--color-warning)]/20 bg-[var(--color-warning-bg)] px-4 py-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 size-5 shrink-0 text-[var(--color-warning)]"
              strokeWidth={2}
              aria-hidden
            />
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[var(--color-warning-text)]">
                {fieldLabels[conflict.field]} mismatch
              </p>
              <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                Rate con and BOL show different values. Tap the correct one:
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onResolve(conflict, "rate_con")}
                  className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-surface-elevated)] px-4 py-3 text-left text-[14px] text-[var(--color-text-primary)]"
                >
                  <span className="tv-label block text-[11px]">Rate Confirmation</span>
                  {conflict.rateConValue}
                </button>
                <button
                  type="button"
                  onClick={() => onResolve(conflict, "bol")}
                  className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-surface-elevated)] px-4 py-3 text-left text-[14px] text-[var(--color-text-primary)]"
                >
                  <span className="tv-label block text-[11px]">Bill of Lading</span>
                  {conflict.bolValue}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
