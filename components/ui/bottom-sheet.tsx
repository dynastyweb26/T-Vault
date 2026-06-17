"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
  surface?: "glass" | "solid";
}

export function BottomSheet({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  className,
  surface = "glass",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="tv-sheet-overlay fixed inset-0 z-[70] flex items-end">
      <div
        role="dialog"
        aria-label={ariaLabel}
        className={cn(
          "tv-sheet-panel w-full max-h-[92dvh] overflow-y-auto border-b-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3",
          surface === "solid"
            ? "border-t border-[var(--color-shell-border)] bg-[var(--color-panel-solid)]"
            : "tv-glass-card border-t border-[var(--color-shell-border)]",
          className
        )}
      >
        <div className="tv-sheet-handle mx-auto mb-5" />
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="tv-section-header">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="tv-icon-btn text-[var(--color-text-secondary)]"
          >
            <X className="size-6" strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
