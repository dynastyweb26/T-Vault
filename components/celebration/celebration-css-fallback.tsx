import { Check } from "lucide-react";

export function CelebrationCssFallback() {
  return (
    <div
      className="tv-celebration-fallback flex size-28 items-center justify-center rounded-full bg-[var(--color-success-bg)]"
      aria-hidden
    >
      <Check
        className="tv-celebration-fallback-icon size-16 text-[var(--color-accent)]"
        strokeWidth={2.5}
      />
    </div>
  );
}
