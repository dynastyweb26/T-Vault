"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Archive, MoreVertical, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatShortDate } from "@/lib/dashboard/format";
import { getBorderColor } from "@/lib/dashboard/job-status";
import type { DashboardJobView } from "@/types/jobs";
import { APP_ROUTES } from "@/lib/constants";
import { saveLoadsScrollPosition } from "@/lib/job-folder/scroll";

interface JobCardProps {
  job: DashboardJobView;
  onAction: () => void;
}

const toneClasses = {
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
  disabled: "bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]",
};

export function JobCard({ job, onAction }: JobCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const startX = useRef(0);
  const swiping = useRef(false);

  const progress = job.docsTotal
    ? (job.docsComplete / job.docsTotal) * 100
    : 0;

  const archiveJob = async () => {
    const supabase = createClient();
    await supabase
      .from("jobs")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", job.id);
    setMenuOpen(false);
    onAction();
  };

  const deleteJob = async () => {
    const confirmed = window.confirm(
      `Delete ${job.job_name}? This cannot be undone.`
    );
    if (!confirmed) return;

    const supabase = createClient();
    await supabase.from("jobs").delete().eq("id", job.id);
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
    <div className="relative overflow-hidden rounded-[var(--radius-card)]">
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
        className="relative bg-[var(--color-surface)] transition-transform duration-200"
        style={{
          transform: `translateX(${offsetX}px)`,
          borderLeft: `3px solid ${getBorderColor(job.borderStatus)}`,
        }}
        onTouchStart={(event) => {
          startX.current = event.touches[0].clientX;
          swiping.current = true;
        }}
        onTouchMove={(event) => {
          if (!swiping.current) return;
          const delta = event.touches[0].clientX - startX.current;
          if (delta < 0) setOffsetX(Math.max(delta, -160));
        }}
        onTouchEnd={() => {
          swiping.current = false;
          setOffsetX(offsetX < -80 ? -160 : 0);
        }}
      >
        <Link
          href={`${APP_ROUTES.loads}/${job.id}`}
          onClick={saveLoadsScrollPosition}
          className="block p-4 pr-12"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[18px] font-bold text-[var(--color-text-primary)]">
              {job.job_name}
            </h3>
            <p className="shrink-0 text-[18px] font-bold text-[var(--color-accent)]">
              {formatCurrency(job.load_value ?? 0)}
            </p>
          </div>

          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {job.broker_name || "No broker"} · {job.pickup_location || "Pickup"} →{" "}
            {job.delivery_location || "Delivery"}
          </p>

          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            {formatShortDate(job.pickup_date)} → {formatShortDate(job.delivery_date)}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">
              {job.docsComplete} of {job.docsTotal} required docs
            </span>
          </div>

          <span
            className={`mt-3 inline-flex rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-medium ${toneClasses[job.statusTone]}`}
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
            <div className="absolute right-0 z-10 mt-1 min-w-36 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-none">
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
}
