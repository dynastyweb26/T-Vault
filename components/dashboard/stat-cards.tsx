import { Flame } from "lucide-react";
import type { DashboardData } from "@/types/jobs";

interface StatCardsProps {
  data: DashboardData;
}

export function StatCards({ data }: StatCardsProps) {
  const streakHot = data.streakDays >= 7;

  return (
    <section className="grid grid-cols-3 gap-3">
      <article className="tv-glass-card rounded-2xl p-4">
        <p className="tv-caption opacity-80">Active Loads</p>
        <p className="tv-tabular mt-2 text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
          {data.activeLoadsCount}
        </p>
      </article>

      <article className="tv-glass-card rounded-2xl p-4">
        <p className="tv-caption opacity-80">Total Miles</p>
        <p className="tv-tabular mt-2 text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
          {data.totalMilesThisMonth.toLocaleString()}
        </p>
      </article>

      <article className="tv-glass-card rounded-2xl p-4">
        <p className="tv-caption flex items-center gap-1 opacity-80">
          Streak
          {streakHot ? (
            <Flame
              className="size-4 text-[var(--color-accent)]"
              strokeWidth={2}
              aria-label="Hot streak"
            />
          ) : null}
        </p>
        <p
          className="tv-tabular mt-2 text-[28px] font-bold leading-none"
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
