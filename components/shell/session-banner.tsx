import { Shield, WifiOff } from "lucide-react";

export function SessionBanner({
  offline = false,
  revalidating = false,
}: {
  offline?: boolean;
  revalidating?: boolean;
}) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-[var(--color-warning)]/25 bg-[var(--color-warning-bg)] px-5 py-3 text-[15px] leading-snug text-[var(--color-warning-text)] backdrop-blur-sm"
    >
      {offline || revalidating ? (
        <WifiOff className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      ) : (
        <Shield className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      )}
      {revalidating
        ? "Reconnecting — revalidating your session…"
        : offline
          ? "You are offline — reconnect to sync your latest data."
          : "Session expires soon — connect to stay signed in."}
    </div>
  );
}

export function DataProtectionBanner() {
  return (
    <div className="tv-glass-card flex items-start gap-3 rounded-2xl border-[var(--color-accent)]/15 px-4 py-3.5">
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
