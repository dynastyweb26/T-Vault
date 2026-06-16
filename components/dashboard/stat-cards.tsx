import { Flame } from "lucide-react";
import type { DashboardData } from "@/types/jobs";

interface StatCardsProps {
  data: DashboardData;
}

export function StatCards({ data }: StatCardsProps) {
  const streakHot = data.streakDays >= 7;

  return (
    <section className="grid grid-cols-3 gap-3">
      <article className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4">
        <p className="text-[13px] text-[var(--color-text-muted)]">Active Loads</p>
        <p className="mt-2 text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
          {data.activeLoadsCount}
        </p>
      </article>

      <article className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4">
        <p className="text-[13px] text-[var(--color-text-muted)]">Total Miles</p>
        <p className="mt-2 text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
          {data.totalMilesThisMonth.toLocaleString()}
        </p>
      </article>

      <article className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4">
        <p className="flex items-center gap-1 text-[13px] text-[var(--color-text-muted)]">
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
          className="mt-2 text-[28px] font-bold leading-none"
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
