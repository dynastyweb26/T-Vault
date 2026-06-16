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
        <label
          htmlFor={inputId}
          className="font-sans text-[15px] font-semibold leading-snug text-[#E9E1D7]"
        >
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
            "tv-tabular h-14 w-full rounded-xl border bg-[#050505] py-0 pl-4 pr-12 text-[17px] font-medium text-[#E9E1D7] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] outline-none transition-colors placeholder:text-[#99907E] focus:border-[var(--gold-light)]",
            error ? "border-[var(--color-danger)]" : "border-[#D4A017]"
          )}
        />
        <span
          className="tv-tabular pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#99907E]"
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
