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
        <label
          htmlFor={inputId}
          className="font-sans text-[15px] font-semibold leading-snug text-[#E9E1D7]"
        >
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          "min-h-[88px] w-full resize-y rounded-xl border bg-[#050505] px-4 py-3 text-[17px] leading-relaxed text-[#E9E1D7] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] outline-none transition-colors placeholder:text-[#99907E] focus:border-[var(--gold-light)]",
          error ? "border-[var(--color-danger)]" : "border-[#D4A017]"
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
