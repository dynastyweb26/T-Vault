"use client";

import { cn } from "@/lib/utils";

interface TvInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  helper?: string;
  counter?: string | null;
}

export function TvInput({
  label,
  error,
  helper,
  counter,
  className,
  id,
  ...props
}: TvInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={inputId} className="tv-label">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "h-14 w-full rounded-[var(--radius-input)] border bg-[var(--color-surface)] px-4 text-[17px] text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]",
          error
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-border)]",
          className
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
