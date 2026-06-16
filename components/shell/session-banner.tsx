import { Shield } from "lucide-react";

export function SessionBanner() {
  return (
    <div
      role="status"
      className="border-b border-[var(--color-warning)]/20 bg-[var(--color-warning-bg)] px-5 py-3 text-[15px] text-[var(--color-warning-text)]"
    >
      Session expires soon — connect to stay signed in.
    </div>
  );
}

export function DataProtectionBanner() {
  return (
    <div className="tv-glass-card flex items-start gap-3 rounded-2xl px-4 py-3">
      <Shield
        className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]"
        strokeWidth={2}
        aria-hidden
      />
      <p className="text-[14px] leading-5 text-[var(--color-text-secondary)]">
        Your load data stays encrypted and belongs to you. T-Vault never sells
        your information.
      </p>
    </div>
  );
}
