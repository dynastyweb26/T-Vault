"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/dashboard/format";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { BrokerHistoryEntry } from "@/lib/broker-history/queries";
import {
  computeDaysToPay,
  ratingOutcomeLabel,
} from "@/lib/broker-history/queries";

interface BrokerHistoryViewProps {
  entries: BrokerHistoryEntry[];
  loading: boolean;
}

const BADGE_ICONS = {
  success: CheckCircle,
  warning: AlertCircle,
  danger: XCircle,
} as const;

export function BrokerHistoryView({ entries, loading }: BrokerHistoryViewProps) {
  const [selected, setSelected] = useState<BrokerHistoryEntry | null>(null);

  if (loading) {
    return <div className="tv-skeleton mx-5 mt-6 h-48 rounded-2xl" />;
  }

  if (entries.length === 0) {
    return (
      <section className="tv-empty-state mx-5 mt-10">
        <CheckCircle
          className="size-12 text-[var(--color-accent)]"
          strokeWidth={2}
          aria-hidden
        />
        <h2 className="tv-card-title mt-4">No broker history yet</h2>
        <p className="tv-body mt-2 max-w-xs text-[var(--color-text-secondary)]">
          Complete loads and rate brokers to build your private intelligence
          file.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 px-5">
        {entries.map((entry) => {
          const BadgeIcon =
            entry.badge?.tone && entry.badge.tone !== null
              ? BADGE_ICONS[entry.badge.tone]
              : CheckCircle;
          const badgeColor =
            entry.badge?.tone === "danger"
              ? "var(--color-danger-text)"
              : entry.badge?.tone === "warning"
                ? "var(--color-warning-text)"
                : "var(--color-success-text)";

          return (
            <button
              key={entry.brokerName}
              type="button"
              onClick={() => setSelected(entry)}
              className="tv-glass-card rounded-2xl p-4 text-left"
            >
              <h3 className="tv-card-title">{entry.brokerName}</h3>
              <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">
                {entry.loadsCompleted} load
                {entry.loadsCompleted === 1 ? "" : "s"} completed
              </p>

              {entry.badge ? (
                <p
                  className="mt-3 flex items-center gap-2 text-[14px] font-medium"
                  style={{ color: badgeColor }}
                >
                  <BadgeIcon className="size-5" strokeWidth={2} aria-hidden />
                  {entry.badge.label}
                </p>
              ) : null}

              {entry.avgDaysToPay !== null ? (
                <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
                  Avg {Math.round(entry.avgDaysToPay)} days to pay
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <BottomSheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={
          selected ? `Your history with ${selected.brokerName}` : undefined
        }
        ariaLabel="Broker load history"
        surface="solid"
      >
        {selected ? (
          <div className="flex flex-col gap-3">
            {selected.jobs.map((job) => {
              const days = computeDaysToPay(job);
              return (
                <article
                  key={job.id}
                  className="rounded-xl border border-[var(--color-shell-border)] p-3"
                >
                  <p className="tv-body font-medium">{job.job_name}</p>
                  <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">
                    {formatShortDate(
                      job.payment_received_date ||
                        job.delivery_date ||
                        job.updated_at?.slice(0, 10) ||
                        null
                    )}{" "}
                    · {formatCurrency(job.load_value ?? 0)}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                    {ratingOutcomeLabel(job.broker_rating)}
                    {days !== null ? ` · ${days} days to pay` : ""}
                  </p>
                </article>
              );
            })}
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}
