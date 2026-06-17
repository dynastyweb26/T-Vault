import { Flame } from "lucide-react";
import type { DashboardData } from "@/types/jobs";

interface StatCardsProps {
  data: DashboardData;
}

export function StatCards({ data }: StatCardsProps) {
  const streakHot = data.streakDays >= 7;

  return (
    <section className="grid grid-cols-3 gap-3.5">
      <article className="tv-glass-card rounded-2xl p-5">
        <p className="tv-caption opacity-80">Active Loads</p>
        <p className="tv-key-number mt-2.5 text-[26px] text-[var(--color-text-primary)]">
          {data.activeLoadsCount}
        </p>
      </article>

      <article className="tv-glass-card rounded-2xl p-5">
        <p className="tv-caption opacity-80">Total Miles</p>
        <p className="tv-key-number mt-2.5 text-[26px] text-[var(--color-text-primary)]">
          {data.totalMilesThisMonth.toLocaleString()}
        </p>
      </article>

      <article className="tv-glass-card rounded-2xl p-5">
        <p className="tv-caption flex items-center gap-1 opacity-80">
          Streak
          {streakHot ? (
            <Flame
              className="size-4 text-[var(--color-accent)] tv-glow-gold-icon"
              strokeWidth={2}
              aria-label="Hot streak"
            />
          ) : null}
        </p>
        <p
          className="tv-key-number mt-2.5 text-[26px]"
          style={{
            color: streakHot
              ? "var(--color-accent)"
              : "var(--color-text-primary)",
          }}
        >
          {data.streakDays}
        </p>
      </article>
    </section>
  );
}
