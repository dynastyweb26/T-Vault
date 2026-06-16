"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface LoadsSearchProps {
  onChange: (value: string) => void;
}

export function LoadsSearch({ onChange }: LoadsSearchProps) {
  const [local, setLocal] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => onChange(local), 300);
    return () => window.clearTimeout(timer);
  }, [local, onChange]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-text-muted)]"
        strokeWidth={2}
        aria-hidden
      />
      <input
        type="search"
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        placeholder="Search job, broker, pickup, delivery"
        className="h-11 w-full rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-input-bg)] pl-12 pr-4 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
        aria-label="Search loads"
      />
    </div>
  );
}
