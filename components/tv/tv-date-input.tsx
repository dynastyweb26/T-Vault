"use client";

import { cn } from "@/lib/utils";

interface TvDateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string | null;
}

export function TvDateInput({
  label,
  error,
  className,
  id,
  ...props
}: TvDateInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex w-full flex-col gap-2">
      <label
        htmlFor={inputId}
        className="font-sans text-[15px] font-semibold leading-snug text-[#E9E1D7]"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        className={cn("tv-date-input", error && "border-[var(--color-danger)]", className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <p className="text-[14px] text-[var(--color-danger-text)]">{error}</p>
      ) : null}
    </div>
  );
}
