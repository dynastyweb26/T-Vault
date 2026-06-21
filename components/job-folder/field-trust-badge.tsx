"use client";

import { AlertTriangle, Bot, PenLine } from "lucide-react";
import type { AiConfidence } from "@/types/jobs";

export const badgeToneClasses = {
  high: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success)]/10",
  medium:
    "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning)]/10",
  low: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] border border-[var(--color-danger)]/10",
  unread:
    "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] border border-[var(--color-danger)]/10",
};

interface FieldTrustBadgeProps {
  confidence: AiConfidence;
  onManualEntry?: () => void;
}

export function FieldTrustBadge({
  confidence,
  onManualEntry,
}: FieldTrustBadgeProps) {
  if (confidence === "manual") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-shell-border)] bg-[var(--color-surface)] px-2 py-0.5 tv-caption normal-case tracking-normal text-[var(--color-text-muted)]">
        <PenLine className="size-3.5" strokeWidth={2} aria-hidden />
        Added Manually
      </span>
    );
  }

  if (confidence === "low" || confidence === "unread") {
    const badge = (
      <>
        <AlertTriangle className="size-3.5" strokeWidth={2} />
        Enter manually
      </>
    );
    if (onManualEntry) {
      return (
        <button
          type="button"
          onClick={onManualEntry}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] transition-opacity active:opacity-80 ${badgeToneClasses.low}`}
        >
          {badge}
        </button>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${badgeToneClasses.low}`}
      >
        {badge}
      </span>
    );
  }

  if (confidence === "medium") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${badgeToneClasses.medium}`}
      >
        <AlertTriangle className="size-3.5" strokeWidth={2} />
        AI — please check
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${badgeToneClasses.high}`}
    >
      <Bot className="size-3.5" strokeWidth={2} />
      AI verified
    </span>
  );
}
