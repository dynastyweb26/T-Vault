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
}

export function BottomSheet({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  className,
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
    <div className="fixed inset-0 z-[70] flex items-end bg-[var(--color-overlay)]">
      <div
        role="dialog"
        aria-label={ariaLabel}
        className={cn(
          "w-full max-h-[92dvh] overflow-y-auto rounded-t-[var(--radius-sheet)] bg-[var(--color-surface-elevated)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3",
          className
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-border)]" />
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-11 items-center justify-center text-[var(--color-text-secondary)]"
          >
            <X className="size-6" strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
