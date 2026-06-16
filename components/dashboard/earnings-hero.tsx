import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/dashboard/format";
import { DollarBillWatermark } from "@/components/dashboard/dollar-bill-watermark";
import type { DashboardData } from "@/types/jobs";

interface EarningsHeroProps {
  data: DashboardData;
}

function getCurrentPeriodLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function EarningsHero({ data }: EarningsHeroProps) {
  const ahead = (data.yearOverYearDiff ?? 0) >= 0;

  return (
    <section className="tv-feed-card tv-metallic-gold tv-gold-glow relative mx-5 flex aspect-[4/5] flex-col items-center justify-center overflow-hidden rounded-2xl">
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="tv-caption mb-4 text-[var(--color-accent)]/80 tracking-[0.2em]">
          Current Revenue Stream
        </span>
        <p className="tv-tabular text-6xl font-bold drop-shadow-xl tv-gradient-text">
          {formatCurrency(data.earnedThisMonth)}
        </p>
        <div className="mt-8 rounded-full border border-white/10 bg-black/40 px-6 py-2 backdrop-blur-md">
          <span className="text-sm text-white/90">
            {data.loadsCompletedThisMonth} Completed Load
            {data.loadsCompletedThisMonth === 1 ? "" : "s"}
          </span>
        </div>

        {data.yearOverYearHasData && data.yearOverYearDiff !== null ? (
          <div
            className="mt-4 flex items-center gap-2 text-[13px]"
            style={{
              color: ahead
                ? "var(--color-success-text)"
                : "var(--color-warning-text)",
            }}
          >
            {ahead ? (
              <TrendingUp className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            ) : (
              <TrendingDown className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            )}
            <span>
              {formatCurrency(Math.abs(data.yearOverYearDiff))}{" "}
              {ahead ? "ahead of" : "behind"} this time last year
            </span>
          </div>
        ) : null}

        {data.projectedAnnual !== null ? (
          <p className="mt-2 text-[12px] text-white/50">
            On pace for {formatCurrency(data.projectedAnnual)} this year
          </p>
        ) : null}
      </div>

      <DollarBillWatermark className="pointer-events-none absolute -right-16 bottom-0 h-[min(72vw,340px)] w-auto translate-y-[12%] rotate-[14deg] select-none text-white opacity-[0.10] [mask-image:linear-gradient(to_top,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_50%,transparent_100%)]" />

      <div className="absolute bottom-0 left-0 flex w-full items-end justify-between bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex flex-col gap-1">
          <p className="tv-caption opacity-60">Active Period</p>
          <p className="text-sm font-bold uppercase">{getCurrentPeriodLabel()}</p>
        </div>
        <a
          href="#ledger-insight"
          aria-label="View ledger insight"
          className="tv-glass-card flex size-12 items-center justify-center rounded-full"
        >
          <BarChart3 className="size-5 text-[var(--color-accent)]" strokeWidth={2} aria-hidden />
        </a>
      </div>
    </section>
  );
}
