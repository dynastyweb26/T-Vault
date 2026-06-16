"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TvButtonVariant = "primary" | "secondary" | "destructive" | "ghost";

interface TvButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TvButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<TvButtonVariant, string> = {
  primary:
    "tv-brushed-gold-btn font-bold text-[var(--color-on-accent)] hover:opacity-95",
  secondary:
    "bg-transparent border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5",
  destructive:
    "bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 text-[var(--color-danger-text)] hover:opacity-90",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]",
};

export function TvButton({
  className,
  variant = "primary",
  loading = false,
  disabled,
  children,
  ...props
}: TvButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "tv-pressable inline-flex h-14 w-full min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-5 animate-spin" strokeWidth={2} aria-hidden />
          <span>Working...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
