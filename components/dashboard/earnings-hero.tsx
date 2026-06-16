import { formatCurrency } from "@/lib/dashboard/format";
import type { DashboardData } from "@/types/jobs";
import { TrendingDown, TrendingUp } from "lucide-react";

interface EarningsHeroProps {
  data: DashboardData;
}

export function EarningsHero({ data }: EarningsHeroProps) {
  const ahead = (data.yearOverYearDiff ?? 0) >= 0;

  return (
    <section
      className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5"
      style={{ borderLeft: "4px solid var(--color-accent)" }}
    >
      <p className="text-[13px] uppercase tracking-wide text-[var(--color-text-muted)]">
        Earned This Month
      </p>
      <p className="mt-2 text-[40px] font-bold leading-none text-[var(--color-accent)]">
        {formatCurrency(data.earnedThisMonth)}
      </p>
      <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">
        {data.loadsCompletedThisMonth} load
        {data.loadsCompletedThisMonth === 1 ? "" : "s"} completed this month
      </p>

      {data.yearOverYearHasData && data.yearOverYearDiff !== null ? (
        <div
          className="mt-4 flex items-center gap-2 text-[14px]"
          style={{
            color: ahead
              ? "var(--color-success-text)"
              : "var(--color-warning-text)",
          }}
        >
          {ahead ? (
            <TrendingUp className="size-5 shrink-0" strokeWidth={2} aria-hidden />
          ) : (
            <TrendingDown className="size-5 shrink-0" strokeWidth={2} aria-hidden />
          )}
          <span>
            {ahead ? "You're" : "You're"}{" "}
            {formatCurrency(Math.abs(data.yearOverYearDiff))}{" "}
            {ahead ? "ahead of" : "behind"} this time last year
          </span>
        </div>
      ) : null}

      {data.projectedAnnual !== null ? (
        <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
          On pace for {formatCurrency(data.projectedAnnual)} this year
        </p>
      ) : null}
    </section>
  );
}
