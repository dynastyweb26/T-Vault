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
    "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[var(--color-accent-press)]",
  secondary:
    "bg-transparent border-[1.5px] border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-surface)]",
  destructive:
    "bg-[var(--color-danger)] text-[var(--color-text-primary)] hover:opacity-90",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]",
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
        "tv-pressable inline-flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] px-4 text-[17px] font-medium transition-[transform,opacity] duration-150 active:scale-[0.97] active:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--color-disabled)] disabled:text-[var(--color-text-muted)] disabled:opacity-100",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-6 animate-spin" strokeWidth={2} aria-hidden />
          <span>Working...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
