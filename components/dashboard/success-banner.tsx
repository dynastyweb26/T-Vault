"use client";

import { useEffect } from "react";

interface SuccessBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export function SuccessBanner({ message, onDismiss }: SuccessBannerProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-[max(4.5rem,env(safe-area-inset-top))] z-50 tv-glass-card rounded-2xl border border-[var(--color-success)]/20 px-4 py-3 text-[15px] text-[var(--color-success-text)]"
    >
      {message}
    </div>
  );
}
