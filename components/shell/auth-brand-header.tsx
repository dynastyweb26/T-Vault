"use client";

import { Wallet } from "lucide-react";

export function AuthBrandHeader() {
  return (
    <div className="mb-8 flex items-center gap-2">
      <div className="tv-brushed-gold-btn flex size-8 items-center justify-center rounded-lg">
        <Wallet className="size-4 text-black" strokeWidth={2.5} aria-hidden />
      </div>
      <span className="text-xl font-bold tracking-tight text-[var(--color-accent)]">
        T-Vault
      </span>
    </div>
  );
}
