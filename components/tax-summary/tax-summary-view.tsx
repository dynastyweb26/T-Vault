"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Info } from "lucide-react";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/dashboard/format";
import type { TaxSummaryData } from "@/lib/tax-summary/calculations";
import {
  TAX_RANGE_TABS,
  type TaxRangeId,
} from "@/lib/tax-summary/date-ranges";
import { APP_ROUTES } from "@/lib/constants";
import { TvButton } from "@/components/tv/tv-button";
import { getCategoryMeta } from "@/lib/expenses/constants";

interface TaxSummaryViewProps {
  data: TaxSummaryData | null;
  loading: boolean;
  rangeId: TaxRangeId;
  customStart: string;
  customEnd: string;
  onRangeChange: (id: TaxRangeId) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
}

export function TaxSummaryView({
  data,
  loading,
  rangeId,
  customStart,
  customEnd,
  onRangeChange,
  onCustomStartChange,
  onCustomEndChange,
  onExportPdf,
  onExportCsv,
}: TaxSummaryViewProps) {
  const [jobsExpanded, setJobsExpanded] = useState(false);
  const isEmpty =
    !data || (data.totalEarned === 0 && data.totalExpenses === 0);

  if (loading) {
    return (
      <div
        data-tour="tax-summary-overview"
        className="tv-skeleton mx-5 mt-6 h-64 rounded-2xl"
      />
    );
  }

  const netPositive = (data?.netIncome ?? 0) >= 0;
  const maxExpense = data?.expenseBreakdown[0]?.amount ?? 1;

  return (
    <div className="flex flex-col gap-4 px-5">
      <div data-tour="tax-summary-overview" className="flex flex-col gap-4">
        <div className="scrollbar-none -mx-5 overflow-x-auto px-5">
          <div className="flex min-w-max gap-1">
            {TAX_RANGE_TABS.map((tab) => {
              const isActive = tab.id === rangeId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onRangeChange(tab.id)}
                  className={`relative flex h-11 shrink-0 items-center px-4 text-[15px] font-medium transition-colors ${
                    isActive
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {tab.label}
                  {isActive ? (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-accent)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {rangeId === "custom" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="tv-label">From</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => onCustomStartChange(e.target.value)}
                className="h-11 rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-input-bg)] px-3 text-[15px]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="tv-label">To</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => onCustomEndChange(e.target.value)}
                className="h-11 rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-input-bg)] px-3 text-[15px]"
              />
            </label>
          </div>
        ) : null}

        {isEmpty ? (
          <section className="tv-empty-state mt-6">
            <Calendar
              className="size-12 text-[var(--color-accent)]"
              strokeWidth={2}
              aria-hidden
            />
            <h2 className="tv-card-title mt-4">No data for this period</h2>
            <p className="tv-body mt-2 max-w-xs text-[var(--color-text-secondary)]">
              Complete loads and log expenses to build your tax summary.
            </p>
            <Link href={APP_ROUTES.loads} className="mt-6 w-full max-w-xs">
              <TvButton>View My Loads</TvButton>
            </Link>
          </section>
        ) : data ? (
          <div className="grid grid-cols-2 gap-3">
            <article className="tv-glass-card rounded-2xl p-4">
              <p className="tv-caption opacity-80">Total Earned</p>
              <p
                className="tv-tabular mt-2 text-[24px] font-bold"
                style={{ color: "var(--color-success-text)" }}
              >
                {formatCurrency(data.totalEarned)}
              </p>
            </article>
            <article className="tv-glass-card rounded-2xl p-4">
              <p className="tv-caption opacity-80">Total Expenses</p>
              <p
                className="tv-tabular mt-2 text-[24px] font-bold"
                style={{ color: "var(--color-danger-text)" }}
              >
                {formatCurrency(data.totalExpenses)}
              </p>
            </article>
            <article className="tv-glass-card rounded-2xl p-4">
              <p className="tv-caption opacity-80">Net Income</p>
              <p
                className="tv-tabular mt-2 text-[24px] font-bold"
                style={{
                  color: netPositive
                    ? "var(--color-success-text)"
                    : "var(--color-danger-text)",
                }}
              >
                {formatCurrency(data.netIncome)}
              </p>
            </article>
            <article className="tv-glass-card rounded-2xl p-4">
              <p className="tv-caption opacity-80">Miles Driven</p>
              <p className="tv-tabular mt-2 text-[24px] font-bold text-[var(--color-accent)]">
                {data.milesDriven.toLocaleString()}
              </p>
            </article>
          </div>
        ) : null}
      </div>

      {!isEmpty && data ? (
        <>
          {data.bestMonth ? (
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Your best month: {data.bestMonth.label} —{" "}
              {formatCurrency(data.bestMonth.amount)}
            </p>
          ) : null}

          <section className="tv-glass-card rounded-2xl p-4">
            <h2 className="tv-section-header mb-4">Expense Breakdown</h2>
            <div className="flex flex-col gap-3">
              {data.expenseBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="mb-1 flex justify-between text-[14px]">
                    <span>{getCategoryMeta(item.category).label}</span>
                    <span className="tv-tabular font-medium">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="tv-progress-track h-2">
                    <div
                      className="tv-progress-fill"
                      style={{
                        "--tv-progress": Math.max(0.04, item.amount / maxExpense),
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="tv-glass-card rounded-2xl p-4">
            <button
              type="button"
              onClick={() => setJobsExpanded((v) => !v)}
              className="flex min-h-11 w-full items-center justify-between"
            >
              <h2 className="tv-section-header">Load by Load Summary</h2>
              <span className="text-[var(--color-text-muted)]">
                {jobsExpanded ? "−" : "+"}
              </span>
            </button>
            {jobsExpanded ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-[13px]">
                  <thead>
                    <tr className="text-[var(--color-text-muted)]">
                      <th className="pb-2 text-left font-medium">Job</th>
                      <th className="pb-2 text-left font-medium">Date</th>
                      <th className="pb-2 text-right font-medium">Revenue</th>
                      <th className="pb-2 text-right font-medium">Expenses</th>
                      <th className="pb-2 text-right font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobSummary.map((row) => (
                      <tr
                        key={row.jobId}
                        className="border-t border-[var(--color-shell-border)]"
                      >
                        <td className="py-2 pr-2">{row.jobName}</td>
                        <td className="py-2">{row.completionDate}</td>
                        <td className="tv-tabular py-2 text-right">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="tv-tabular py-2 text-right">
                          {formatCurrency(row.expenses)}
                        </td>
                        <td
                          className="tv-tabular py-2 text-right font-medium"
                          style={{
                            color:
                              row.net >= 0
                                ? "var(--color-success-text)"
                                : "var(--color-danger-text)",
                          }}
                        >
                          {formatCurrency(row.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <Link
            href={APP_ROUTES.costPerMile}
            className="tv-glass-card block rounded-2xl p-4"
          >
            <p className="tv-body font-medium">Cost Per Mile</p>
            <p className="tv-tabular mt-1 text-[18px] font-bold text-[var(--color-accent)]">
              {formatCurrencyDetailed(data.costPerMile.netPerMile)}/mile net
            </p>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <TvButton variant="secondary" onClick={onExportPdf}>
              Export PDF
            </TvButton>
            <TvButton variant="secondary" onClick={onExportCsv}>
              Export CSV
            </TvButton>
          </div>

          <div className="flex gap-3 rounded-2xl bg-[var(--color-warning-bg)] p-4">
            <Info
              className="size-5 shrink-0 text-[var(--color-warning-text)]"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-[14px] text-[var(--color-warning-text)]">
              IFTA Note: This app tracks total miles. For state-by-state IFTA
              filing, use your ELD logs. IFTA integration is coming to T-Vault
              soon.
            </p>
          </div>

          <p className="text-[13px] text-[var(--color-text-muted)]">
            For reference only. Not tax advice. Consult a qualified tax
            professional.
          </p>
        </>
      ) : null}
    </div>
  );
}
