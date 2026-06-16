import Link from "next/link";
import { Clock } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/dashboard/format";
import type { AwaitingPaymentItem } from "@/types/jobs";
import { APP_ROUTES } from "@/lib/constants";

interface AwaitingPaymentProps {
  items: AwaitingPaymentItem[];
}

export function AwaitingPayment({ items }: AwaitingPaymentProps) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="tv-section-header mb-3 flex items-center gap-2 text-[var(--color-warning-text)]">
        <Clock className="size-5" strokeWidth={2} aria-hidden />
        Awaiting Payment
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`${APP_ROUTES.loads}/${item.jobId}?section=payment`}
            className="tv-glass-card rounded-2xl px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[16px] font-medium text-[var(--color-text-primary)]">
                {item.jobName}
              </p>
              <p className="tv-tabular text-[16px] font-bold text-[var(--color-accent)]">
                {formatCurrency(item.amount)}
              </p>
            </div>
            <p
              className="mt-1 text-[14px]"
              style={{
                color: item.isOverdue
                  ? "var(--color-danger-text)"
                  : "var(--color-text-secondary)",
              }}
            >
              {item.isOverdue
                ? `${item.daysOverdue} days overdue`
                : item.expectedDate
                  ? `Expected ${formatShortDate(item.expectedDate)}`
                  : "Payment pending"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
