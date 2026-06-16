"use client";

import { Wallet } from "lucide-react";

export function AuthBrandHeader() {
  return (
    <div className="mb-8 flex items-center gap-2">
      <div className="tv-brushed-gold-btn flex size-11 items-center justify-center rounded-lg">
        <Wallet
          className="size-5 text-[var(--color-on-accent)]"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
      <span className="tv-section-header tracking-tight text-[var(--color-accent)]">
        T-Vault
      </span>
    </div>
  );
}
