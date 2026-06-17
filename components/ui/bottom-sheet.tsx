"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

const SHEET_MS = 340;

export function BottomSheet({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  className,
  surface = "glass",
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), SHEET_MS);
    document.body.style.overflow = "";
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "tv-sheet-overlay fixed inset-0 z-[70] flex items-end",
        visible ? "tv-sheet-overlay-open" : "tv-sheet-overlay-closed"
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={ariaLabel}
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "tv-sheet-panel w-full max-h-[92dvh] overflow-y-auto border-b-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3",
          visible ? "tv-sheet-panel-open" : "tv-sheet-panel-closed",
          surface === "solid"
            ? "border-t border-[var(--color-shell-border)] bg-[var(--color-panel-solid)]"
            : "tv-glass-card border-t border-[var(--color-shell-border)]",
          className
        )}
      >
        <div className="tv-sheet-handle mx-auto mb-5" />
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="tv-section-header">{title}</h2> : <span />}
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
    </div>,
    document.body
  );
}
