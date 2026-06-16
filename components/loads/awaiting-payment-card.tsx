"use client";

import Link from "next/link";
import { formatCurrency, formatShortDate } from "@/lib/dashboard/format";
import { daysBetweenToday } from "@/lib/dashboard/format";
import type { Job } from "@/types/jobs";
import { APP_ROUTES } from "@/lib/constants";
import { TvButton } from "@/components/tv/tv-button";

interface AwaitingPaymentCardProps {
  job: Job;
  onMarkPaid: (job: Job) => void;
  marking?: boolean;
}

export function AwaitingPaymentCard({
  job,
  onMarkPaid,
  marking = false,
}: AwaitingPaymentCardProps) {
  const expectedDate = job.payment_expected_date;
  const daysOverdue = expectedDate ? daysBetweenToday(expectedDate) : 0;
  const isOverdue = daysOverdue > 0;

  return (
    <article
      className="tv-glass-card flex items-center gap-3 rounded-2xl p-4"
      style={{ borderLeft: "3px solid var(--color-warning)" }}
    >
      <Link
        href={`${APP_ROUTES.loads}/${job.id}?section=payment`}
        className="min-w-0 flex-1"
      >
        <h3 className="tv-card-title truncate">{job.job_name}</h3>
        <p className="tv-tabular mt-1 text-[18px] font-bold text-[var(--color-accent)]">
          {formatCurrency(job.load_value ?? 0)}
        </p>
        <p
          className="tv-body mt-1 text-[14px]"
          style={{
            color: isOverdue
              ? "var(--color-danger-text)"
              : "var(--color-text-secondary)",
          }}
        >
          {isOverdue
            ? `${daysOverdue} days OVERDUE`
            : expectedDate
              ? `Expected ${formatShortDate(expectedDate)}`
              : "Payment pending"}
        </p>
      </Link>
      <TvButton
        className="h-11 w-auto shrink-0 px-4 text-[14px]"
        loading={marking}
        onClick={() => onMarkPaid(job)}
      >
        Mark as Paid
      </TvButton>
    </article>
  );
}
