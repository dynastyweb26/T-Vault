import { formatCurrency } from "@/lib/dashboard/format";
import type { DashboardData } from "@/types/jobs";

interface MoneyOutRowProps {
  data: DashboardData;
}

export function MoneyOutRow({ data }: MoneyOutRowProps) {
  const netPositive = data.netSoFar >= 0;

  return (
    <section className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-5 py-4">
      <p className="text-[15px] text-[var(--color-danger)]">
        Expenses this month: {formatCurrency(data.expensesThisMonth)}
      </p>
      <p
        className="mt-1 text-[15px] font-medium"
        style={{
          color: netPositive
            ? "var(--color-success)"
            : "var(--color-danger)",
        }}
      >
        Net so far: {formatCurrency(data.netSoFar)}
      </p>
    </section>
  );
}
