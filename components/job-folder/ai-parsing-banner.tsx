"use client";

import { AlertTriangle } from "lucide-react";

interface AiParsingBannerProps {
  type: "rate_limited" | "parse_failed";
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function AiParsingBanner({ type, onDismiss, onRetry }: AiParsingBannerProps) {
  const message =
    type === "rate_limited"
      ? "AI parsing limit reached (10/hour). Your document uploaded — enter details manually or try again later."
      : "AI parsing unavailable. Your document uploaded — enter details manually.";

  return (
    <div
      role="status"
      className="mt-3 flex items-start gap-3 rounded-2xl border border-[var(--color-warning)]/20 bg-[var(--color-warning-bg)] px-4 py-3"
    >
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 text-[var(--color-warning)]"
        strokeWidth={2}
        aria-hidden
      />
      <div className="flex-1">
        <p className="text-[14px] leading-5 text-[var(--color-warning-text)]">{message}</p>
        {type === "parse_failed" && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-[14px] font-medium text-[var(--color-accent)]"
          >
            Retry parsing
          </button>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-[13px] text-[var(--color-text-muted)]"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
