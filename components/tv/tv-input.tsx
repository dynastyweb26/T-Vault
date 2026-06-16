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
              ? "tv-body font-semibold text-[var(--color-text-primary)]"
              : "tv-label"
          }
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "tv-input-field",
          borderVariant === "gold" && "tv-input-field-gold",
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
              className="tv-body text-[14px] text-[var(--color-text-secondary)]"
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
