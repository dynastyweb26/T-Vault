"use client";

import { cn } from "@/lib/utils";

interface TvTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | null;
}

export function TvTextarea({
  label,
  error,
  className,
  id,
  rows = 3,
  ...props
}: TvTextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const showLabel = label.trim().length > 0;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {showLabel ? (
        <label htmlFor={inputId} className="tv-body font-semibold text-[var(--color-text-primary)]">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          "tv-input-field tv-input-field-gold min-h-[88px] resize-y py-3 leading-relaxed",
          error && "border-[var(--color-danger)]"
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <p className="text-[14px] text-[var(--color-danger-text)]">{error}</p>
      ) : null}
    </div>
  );
}
