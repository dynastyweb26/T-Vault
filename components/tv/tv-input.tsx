"use client";

import { cn } from "@/lib/utils";

interface TvInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  helper?: string;
  counter?: string | null;
  labelVariant?: "default" | "readable";
  borderVariant?: "default" | "gold";
}

export function TvInput({
  label,
  error,
  helper,
  counter,
  labelVariant = "default",
  borderVariant = "default",
  className,
  id,
  ...props
}: TvInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const showLabel = label.trim().length > 0;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {showLabel ? (
        <label
          htmlFor={inputId}
          className={
            labelVariant === "readable"
              ? "font-sans text-[15px] font-semibold leading-snug text-[#E9E1D7]"
              : "tv-label"
          }
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "h-14 w-full rounded-xl border bg-[#050505] px-4 text-[17px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] outline-none transition-colors",
          borderVariant === "gold"
            ? "border-[#D4A017] text-[#E9E1D7] placeholder:text-[#99907E] focus:border-[var(--gold-light)]"
            : error
              ? "border-[var(--color-danger)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
              : "border-white/5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]",
          error && "border-[var(--color-danger)]"
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined
        }
        {...props}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {error ? (
            <p
              id={`${inputId}-error`}
              className="text-[14px] text-[var(--color-danger-text)]"
            >
              {error}
            </p>
          ) : helper ? (
            <p
              id={`${inputId}-helper`}
              className="text-[14px] text-[var(--color-text-secondary)]"
            >
              {helper}
            </p>
          ) : null}
        </div>
        {counter ? (
          <span className="tv-caption shrink-0">{counter}</span>
        ) : null}
      </div>
    </div>
  );
}
