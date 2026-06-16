"use client";

import { Wallet } from "lucide-react";

export function RouteGuardLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="tv-brushed-gold-btn mb-6 flex size-16 items-center justify-center rounded-2xl">
        <Wallet className="size-8 text-black" strokeWidth={2} aria-hidden />
      </div>
      <div className="tv-skeleton h-3 w-32 rounded-full" />
    </div>
  );
}
