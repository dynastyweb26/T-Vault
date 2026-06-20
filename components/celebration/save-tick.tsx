"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveTickButtonProps = {
  loading: boolean;
  success: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
};

export function SaveTickButton({
  loading,
  success,
  onClick,
  label = "Save Expense",
  className,
}: SaveTickButtonProps) {
  return (
    <button
      type="button"
      disabled={loading || success}
      onClick={onClick}
      className={cn(
        "tv-save-tick-btn tv-pressable inline-flex h-14 w-full min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold tracking-[-0.01em] disabled:cursor-not-allowed",
        success
          ? "tv-save-tick-btn--success"
          : "tv-brushed-gold-btn text-[var(--color-on-accent)]",
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="size-5 animate-spin" strokeWidth={2} aria-hidden />
          <span>Working...</span>
        </>
      ) : success ? (
        <>
          <Check className="tv-save-tick-icon size-5" strokeWidth={2.5} aria-hidden />
          <span>Saved</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
