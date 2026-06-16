"use client";

import { cn } from "@/lib/utils";

interface TvMilesInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  className?: string;
  id?: string;
}

export function TvMilesInput({
  label,
  value,
  onChange,
  error,
  className,
  id,
}: TvMilesInputProps) {
  const inputId = id ?? "miles";
  const showLabel = label.trim().length > 0;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {showLabel ? (
        <label htmlFor={inputId} className="tv-body font-semibold text-[var(--color-text-primary)]">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          type="number"
          min={0}
          max={9999}
          step={1}
          placeholder="0"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(
            "tv-input-field tv-input-field-gold tv-tabular pr-12 font-medium",
            error && "border-[var(--color-danger)]"
          )}
        />
        <span
          className="tv-tabular pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[var(--color-text-muted)]"
          aria-hidden
        >
          mi
        </span>
      </div>
      {error ? (
        <p className="text-[14px] text-[var(--color-danger-text)]">{error}</p>
      ) : null}
    </div>
  );
}
