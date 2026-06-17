"use client";

import { formatCurrencyDetailed } from "@/lib/dashboard/format";
import type { ExpenseSummary } from "@/lib/expenses/queries";

interface ExpenseSummaryCardProps {
  summary: ExpenseSummary;
}

export function ExpenseSummaryCard({ summary }: ExpenseSummaryCardProps) {
  return (
    <div className="tv-glass-card rounded-2xl p-5">
      <p className="tv-caption text-[13px] text-[var(--color-text-muted)]">
        Total Expenses This Month
      </p>
      <p className="tv-key-number mt-2 text-[var(--color-danger)]">
        {formatCurrencyDetailed(summary.totalThisMonth)}
      </p>
      <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">
        <span className="tv-tabular">
          Per-load: {formatCurrencyDetailed(summary.perLoadThisMonth)}
        </span>
        <span className="mx-2 text-[var(--color-text-muted)]">|</span>
        <span className="tv-tabular">
          Truck costs: {formatCurrencyDetailed(summary.truckThisMonth)}
        </span>
      </p>
      <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
        Per-load expenses are inside each job folder
      </p>
    </div>
  );
}
