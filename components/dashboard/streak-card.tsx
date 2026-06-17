"use client";

import { Flame } from "lucide-react";
import type { DashboardData } from "@/types/jobs";

interface StreakBannerProps {
  streakDays: number;
}

export function StreakCard({ streakDays }: StreakBannerProps) {
  const hot = streakDays >= 7;
  const message =
    streakDays === 0
      ? "Start your streak today."
      : streakDays >= 7
        ? `${streakDays} days in a row. You're building a habit.`
        : null;

  return (
    <section className="flex flex-col gap-2">
      <article className="tv-glass-card rounded-2xl p-4">
        <p className="tv-caption flex items-center gap-1 opacity-80">
          Streak
          {hot ? (
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
            color: hot
              ? "var(--color-accent)"
              : "var(--color-text-primary)",
          }}
        >
          {streakDays}
        </p>
      </article>
      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-center text-[16px] ${
            hot
              ? "border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          {message}
        </div>
      ) : null}
    </section>
  );
}

export function StatCards({ data }: { data: DashboardData }) {
  return (
    <section className="grid grid-cols-3 gap-3">
      <article className="tv-glass-card rounded-2xl p-4">
        <p className="tv-caption opacity-80">Active Loads</p>
        <p className="tv-tabular mt-2 text-[28px] font-bold leading-none">
          {data.activeLoadsCount}
        </p>
      </article>
      <article className="tv-glass-card rounded-2xl p-4">
        <p className="tv-caption opacity-80">Total Miles</p>
        <p className="tv-tabular mt-2 text-[28px] font-bold leading-none">
          {data.totalMilesThisMonth.toLocaleString()}
        </p>
      </article>
      <article className="tv-glass-card rounded-2xl p-4">
        <p className="tv-caption opacity-80">Streak</p>
        <p className="tv-tabular mt-2 text-[28px] font-bold leading-none">
          {data.streakDays}
        </p>
      </article>
    </section>
  );
}
