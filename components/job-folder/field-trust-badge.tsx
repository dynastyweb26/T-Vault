"use client";

import type { ReactNode } from "react";
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
  confidence: AiConfidence | null;
  onManualEntry?: () => void;
}

function ManualEntryBadge({
  toneClass,
  label,
  onManualEntry,
  icon,
}: {
  toneClass: string;
  label: string;
  onManualEntry?: () => void;
  icon: ReactNode;
}) {
  const content = (
    <>
      {icon}
      {label}
    </>
  );

  if (onManualEntry) {
    return (
      <button
        type="button"
        onClick={onManualEntry}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] transition-opacity active:opacity-80 ${toneClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${toneClass}`}
    >
      {content}
    </span>
  );
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

  if (!confidence || confidence === "low" || confidence === "unread") {
    return (
      <ManualEntryBadge
        toneClass={badgeToneClasses.low}
        label="Enter manually"
        onManualEntry={onManualEntry}
        icon={<AlertTriangle className="size-3.5" strokeWidth={2} />}
      />
    );
  }

  if (confidence === "medium") {
    return (
      <ManualEntryBadge
        toneClass={badgeToneClasses.medium}
        label="AI — please check"
        onManualEntry={onManualEntry}
        icon={<AlertTriangle className="size-3.5" strokeWidth={2} />}
      />
    );
  }

  return (
    <ManualEntryBadge
      toneClass={badgeToneClasses.high}
      label="AI verified"
      onManualEntry={onManualEntry}
      icon={<Bot className="size-3.5" strokeWidth={2} />}
    />
  );
}
