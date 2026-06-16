import { Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/dashboard/format";
import type { DashboardData } from "@/types/jobs";

interface MoneyOutRowProps {
  data: DashboardData;
}

export function MoneyOutRow({ data }: MoneyOutRowProps) {
  const netPositive = data.netSoFar >= 0;

  return (
    <section id="ledger-insight" className="tv-feed-card px-5">
      <div className="tv-glass-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--color-shell-border)] p-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
            <Receipt className="size-4 text-[var(--color-accent)]" strokeWidth={2} aria-hidden />
          </div>
          <span className="tv-body text-sm font-bold">Ledger Insight</span>
          <span className="tv-caption ml-auto normal-case tracking-normal opacity-60">
            Vault Data
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <h3 className="tv-section-header text-center italic">
            {netPositive
              ? "Your profit margin is looking steady."
              : "Expenses are outpacing revenue this month."}
          </h3>

          <div className="mt-2 flex flex-col gap-2">
            <div className="tv-glass-card flex items-center justify-between rounded-2xl border border-[var(--color-danger)]/10 bg-[var(--color-danger-bg)] p-3">
              <span className="tv-body text-sm opacity-80">Gross Expenses</span>
              <span className="tv-tabular font-bold text-[var(--color-danger-text)]">
                {formatCurrency(data.expensesThisMonth)}
              </span>
            </div>
            <div className="tv-glass-card flex items-center justify-between rounded-2xl border border-[var(--color-success)]/10 bg-[var(--color-success-bg)] p-3">
              <span className="tv-body text-sm opacity-80">Net Profit</span>
              <span
                className="tv-tabular font-bold"
                style={{
                  color: netPositive
                    ? "var(--color-success-text)"
                    : "var(--color-danger-text)",
                }}
              >
                {formatCurrency(data.netSoFar)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
