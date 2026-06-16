"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrencyDetailed } from "@/lib/dashboard/format";
import type { CostPerMileData } from "@/lib/cost-per-mile/calculations";
import { APP_ROUTES } from "@/lib/constants";

interface CostPerMileWeekCardProps {
  data: CostPerMileData["thisWeek"];
}

export function CostPerMileWeekCard({ data }: CostPerMileWeekCardProps) {
  const netPositive = data.netPerMile >= 0;

  return (
    <section className="rounded-2xl bg-[var(--color-surface)] p-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="tv-caption normal-case tracking-normal text-[var(--color-text-muted)]">
            Earned
          </p>
          <p
            className="tv-tabular mt-1 text-[36px] font-bold leading-none"
            style={{ color: "var(--color-success-text)" }}
          >
            {formatCurrencyDetailed(data.earnedPerMile)}
          </p>
          <p className="tv-caption mt-1 normal-case tracking-normal">
            {formatCurrencyDetailed(data.revenue)} / {data.miles.toLocaleString()} mi
          </p>
        </div>
        <div>
          <p className="tv-caption normal-case tracking-normal text-[var(--color-text-muted)]">
            Cost
          </p>
          <p
            className="tv-tabular mt-1 text-[36px] font-bold leading-none"
            style={{ color: "var(--color-danger-text)" }}
          >
            {formatCurrencyDetailed(data.costPerMile)}
          </p>
          <p className="tv-caption mt-1 normal-case tracking-normal">
            {formatCurrencyDetailed(data.expenses)} / {data.miles.toLocaleString()} mi
          </p>
        </div>
      </div>

      <div className="mt-5 text-center">
        {netPositive ? (
          <p
            className="tv-tabular text-[28px] font-bold"
            style={{ color: "var(--color-success-text)" }}
          >
            <TrendingUp className="mr-1 inline size-6" strokeWidth={2} aria-hidden />
            {formatCurrencyDetailed(data.netPerMile)}/mile profit
          </p>
        ) : (
          <p
            className="tv-tabular text-[28px] font-bold"
            style={{ color: "var(--color-danger-text)" }}
          >
            <TrendingDown className="mr-1 inline size-6" strokeWidth={2} aria-hidden />
            {formatCurrencyDetailed(Math.abs(data.netPerMile))}/mile loss
          </p>
        )}
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          Healthy target: $0.40-$0.80/mile profit
        </p>
      </div>
    </section>
  );
}

interface CostPerMileTrendChartProps {
  weeks: CostPerMileData["weeklyTrend"];
}

export function CostPerMileTrendChart({ weeks }: CostPerMileTrendChartProps) {
  const maxValue = Math.max(
    ...weeks.map((w) => Math.max(w.earnedPerMile, w.costPerMile)),
    0.5
  );
  const chartHeight = 160;

  return (
    <section className="tv-glass-card rounded-2xl p-4">
      <h2 className="tv-section-header mb-4">8-Week Trend</h2>
      <div className="relative" style={{ height: chartHeight + 40 }}>
        <svg
          viewBox={`0 0 ${weeks.length * 40} ${chartHeight + 20}`}
          className="w-full"
          role="img"
          aria-label="8 week cost per mile trend"
        >
          {weeks.map((week, index) => {
            const barHeight =
              maxValue > 0
                ? (week.earnedPerMile / maxValue) * chartHeight
                : 0;
            const x = index * 40 + 8;
            return (
              <g key={week.week.start}>
                <rect
                  x={x}
                  y={chartHeight - barHeight}
                  width={24}
                  height={barHeight}
                  fill="var(--color-accent)"
                  rx={2}
                />
                <text
                  x={x + 12}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--color-text-muted)"
                >
                  {week.week.label}
                </text>
              </g>
            );
          })}
          <polyline
            fill="none"
            stroke="var(--color-danger)"
            strokeWidth={2}
            points={weeks
              .map((week, index) => {
                const y =
                  chartHeight -
                  (maxValue > 0
                    ? (week.costPerMile / maxValue) * chartHeight
                    : 0);
                return `${index * 40 + 20},${y}`;
              })
              .join(" ")}
          />
        </svg>
        <div className="mt-2 flex justify-center gap-4 text-[12px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm bg-[var(--color-accent)]" />
            Earned/mi
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 bg-[var(--color-danger)]" />
            Cost/mi
          </span>
        </div>
      </div>
    </section>
  );
}

interface CostPerMileBreakdownProps {
  thisMonth: CostPerMileData["thisMonth"];
  lastMonth: CostPerMileData["lastMonth"];
}

function BreakdownRow({
  label,
  thisValue,
  lastValue,
  format = formatCurrencyDetailed,
  highlight,
}: {
  label: string;
  thisValue: number;
  lastValue: number;
  format?: (n: number) => string;
  highlight?: "success" | "danger" | null;
}) {
  return (
    <tr className="border-b border-[var(--color-shell-border)]">
      <td className="py-3 text-[15px] text-[var(--color-text-primary)]">
        {label}
      </td>
      <td
        className="tv-tabular py-3 text-right text-[15px] font-medium"
        style={
          highlight === "success"
            ? { color: "var(--color-success-text)" }
            : highlight === "danger"
              ? { color: "var(--color-danger-text)" }
              : undefined
        }
      >
        {format(thisValue)}
      </td>
      <td className="tv-tabular py-3 text-right text-[14px] text-[var(--color-text-muted)]">
        {format(lastValue)}
      </td>
    </tr>
  );
}

export function CostPerMileBreakdown({
  thisMonth,
  lastMonth,
}: CostPerMileBreakdownProps) {
  const netHighlight =
    thisMonth.netPerMile >= 0 ? ("success" as const) : ("danger" as const);

  return (
    <section className="tv-glass-card overflow-hidden rounded-2xl p-4">
      <h2 className="tv-section-header mb-3">This Month</h2>
      <table className="w-full">
        <thead>
          <tr className="text-[12px] text-[var(--color-text-muted)]">
            <th className="pb-2 text-left font-medium">Metric</th>
            <th className="pb-2 text-right font-medium">This Month</th>
            <th className="pb-2 text-right font-medium">Last Month</th>
          </tr>
        </thead>
        <tbody>
          <BreakdownRow
            label="Total Revenue"
            thisValue={thisMonth.revenue}
            lastValue={lastMonth.revenue}
            format={(n) =>
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(n)
            }
          />
          <BreakdownRow
            label="Total Miles"
            thisValue={thisMonth.miles}
            lastValue={lastMonth.miles}
            format={(n) => n.toLocaleString()}
          />
          <BreakdownRow
            label="Total Expenses"
            thisValue={thisMonth.expenses}
            lastValue={lastMonth.expenses}
            format={(n) =>
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(n)
            }
          />
          <BreakdownRow
            label="Revenue/Mile"
            thisValue={thisMonth.revenuePerMile}
            lastValue={lastMonth.revenuePerMile}
          />
          <BreakdownRow
            label="Cost/Mile"
            thisValue={thisMonth.costPerMile}
            lastValue={lastMonth.costPerMile}
          />
          <BreakdownRow
            label="Net/Mile"
            thisValue={thisMonth.netPerMile}
            lastValue={lastMonth.netPerMile}
            highlight={netHighlight}
          />
        </tbody>
      </table>
    </section>
  );
}

interface LoadComparisonTableProps {
  loads: CostPerMileData["loadComparison"];
}

export function LoadComparisonTable({ loads }: LoadComparisonTableProps) {
  const [expanded, setExpanded] = useState(false);

  if (loads.length === 0) return null;

  return (
    <section className="tv-glass-card rounded-2xl p-4">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between"
      >
        <h2 className="tv-section-header">Load by Load</h2>
        <span className="text-[var(--color-text-muted)]">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-[var(--color-text-muted)]">
                <th className="pb-2 text-left font-medium">Job</th>
                <th className="pb-2 text-right font-medium">Miles</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
                <th className="pb-2 text-right font-medium">Expenses</th>
                <th className="pb-2 text-right font-medium">Rev/mi</th>
                <th className="pb-2 text-right font-medium">Cost/mi</th>
                <th className="pb-2 text-right font-medium">Net/mi</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((row) => {
                const negative = row.netPerMile < 0;
                return (
                  <tr
                    key={row.jobId}
                    className="border-t border-[var(--color-shell-border)]"
                    style={
                      negative
                        ? { backgroundColor: "var(--color-danger-bg)" }
                        : undefined
                    }
                  >
                    <td className="py-2 pr-2">{row.jobName}</td>
                    <td className="tv-tabular py-2 text-right">
                      {row.miles.toLocaleString()}
                    </td>
                    <td className="tv-tabular py-2 text-right">
                      {formatCurrencyDetailed(row.revenue)}
                    </td>
                    <td className="tv-tabular py-2 text-right">
                      {formatCurrencyDetailed(row.expenses)}
                    </td>
                    <td className="tv-tabular py-2 text-right">
                      {formatCurrencyDetailed(row.revenuePerMile)}
                    </td>
                    <td className="tv-tabular py-2 text-right">
                      {formatCurrencyDetailed(row.costPerMile)}
                    </td>
                    <td
                      className="tv-tabular py-2 text-right font-medium"
                      style={
                        negative
                          ? { color: "var(--color-danger-text)" }
                          : { color: "var(--color-success-text)" }
                      }
                    >
                      {formatCurrencyDetailed(row.netPerMile)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

interface FuelEfficiencyNoteProps {
  fuelCostPerMile: number;
  fuelReceiptCount: number;
}

export function FuelEfficiencyNote({
  fuelCostPerMile,
  fuelReceiptCount,
}: FuelEfficiencyNoteProps) {
  return (
    <p className="text-[13px] text-[var(--color-text-muted)]">
      Your avg fuel cost:{" "}
      <span className="tv-tabular font-medium text-[var(--color-text-secondary)]">
        {formatCurrencyDetailed(fuelCostPerMile)}/mile
      </span>{" "}
      based on {fuelReceiptCount} fuel receipt
      {fuelReceiptCount === 1 ? "" : "s"}. Industry average: $0.58-0.62/mile at
      current diesel prices.
    </p>
  );
}

interface CostPerMileCardProps {
  netPerMile: number;
}

export function CostPerMileDashboardCard({ netPerMile }: CostPerMileCardProps) {
  const positive = netPerMile >= 0;

  return (
    <Link
      href={APP_ROUTES.costPerMile}
      className="tv-glass-card block rounded-2xl p-4 transition-opacity hover:opacity-95"
    >
      <p className="tv-caption opacity-80">Cost Per Mile</p>
      <p
        className="tv-tabular mt-2 text-[28px] font-bold leading-none"
        style={{
          color: positive
            ? "var(--color-success-text)"
            : "var(--color-danger-text)",
        }}
      >
        {formatCurrencyDetailed(netPerMile)}/mi
      </p>
      <p className="tv-body mt-2 text-[14px] text-[var(--color-text-secondary)]">
        Tap to beat your number every week
      </p>
    </Link>
  );
}
