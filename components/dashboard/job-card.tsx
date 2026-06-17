"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { Archive, MoreVertical, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatShortDate } from "@/lib/dashboard/format";
import { getBorderColor } from "@/lib/dashboard/job-status";
import { useSwipeToReveal } from "@/hooks/use-swipe-to-reveal";
import type { DashboardJobView } from "@/types/jobs";
import { APP_ROUTES } from "@/lib/constants";
import { saveLoadsScrollPosition } from "@/lib/job-folder/scroll";
import { useDeleteUndo } from "@/components/providers/delete-undo-provider";

interface JobCardProps {
  job: DashboardJobView;
  onAction: () => void;
  tourTarget?: boolean;
}

const toneClasses = {
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success)]/10",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning)]/10",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] border border-[var(--color-danger)]/10",
  disabled: "bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-shell-border)]",
};

export const JobCard = memo(function JobCard({
  job,
  onAction,
  tourTarget = false,
}: JobCardProps) {
  const { surfaceRef, handlers } = useSwipeToReveal({
    maxOffset: 160,
    snapThreshold: 0.5,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const { deleteJobWithUndo } = useDeleteUndo();

  const progress = job.docsTotal
    ? job.docsComplete / job.docsTotal
    : 0;

  const archiveJob = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("jobs")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("user_id", user.id);
    setMenuOpen(false);
    onAction();
  };

  const deleteJob = async () => {
    const confirmed = window.confirm(
      `Delete ${job.job_name}? You can undo for a few seconds.`
    );
    if (!confirmed) return;

    const result = await deleteJobWithUndo(job.id, job.job_name);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    setMenuOpen(false);
    onAction();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      {...(tourTarget ? { "data-tour": "loads-job-card" } : {})}
    >
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={archiveJob}
          className="flex w-20 items-center justify-center bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
          aria-label={`Archive ${job.job_name}`}
        >
          <Archive className="size-5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={deleteJob}
          className="flex w-20 items-center justify-center bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
          aria-label={`Delete ${job.job_name}`}
        >
          <Trash2 className="size-5" strokeWidth={2} />
        </button>
      </div>

      <div
        ref={surfaceRef}
        className="tv-swipe-surface tv-glass-card relative"
        style={{
          borderLeft: `3px solid ${getBorderColor(job.borderStatus)}`,
        }}
        {...handlers}
      >
        <Link
          href={`${APP_ROUTES.loads}/${job.id}`}
          onClick={saveLoadsScrollPosition}
          className="block p-4 pr-12"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="tv-card-title">{job.job_name}</h3>
            <p className="tv-tabular tv-key-number shrink-0 text-[18px]">
              {formatCurrency(job.load_value ?? 0)}
            </p>
          </div>

          <p className="tv-body mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {job.broker_name || "No broker"} · {job.pickup_location || "Pickup"} →{" "}
            {job.delivery_location || "Delivery"}
          </p>

          <p className="tv-caption mt-1 normal-case tracking-normal">
            {formatShortDate(job.pickup_date)} → {formatShortDate(job.delivery_date)}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="tv-progress-track h-2 flex-1">
              <div
                className="tv-progress-fill"
                style={{ "--tv-progress": progress } as React.CSSProperties}
              />
            </div>
            <span className="tv-caption shrink-0 normal-case tracking-normal">
              {job.docsComplete} of {job.docsTotal} required docs
            </span>
          </div>

          <span
            className={`mt-3 inline-flex rounded-full px-3 py-1 tv-caption normal-case tracking-normal font-medium ${toneClasses[job.statusTone]}`}
          >
            {job.statusLabel}
          </span>
        </Link>

        <div className="absolute right-3 top-3">
          <button
            type="button"
            aria-label={`More actions for ${job.job_name}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            className="flex size-11 items-center justify-center rounded-full text-[var(--color-text-secondary)]"
          >
            <MoreVertical className="size-5" strokeWidth={2} />
          </button>

          {menuOpen ? (
            <div className="tv-glass-card absolute right-0 z-10 mt-1 min-w-36 rounded-xl py-1">
              <button
                type="button"
                onClick={archiveJob}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-[var(--color-text-primary)]"
              >
                <Archive className="size-4" strokeWidth={2} aria-hidden />
                Archive
              </button>
              <button
                type="button"
                onClick={deleteJob}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-[var(--color-danger-text)]"
              >
                <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
