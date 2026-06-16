"use client";

import Link from "next/link";
import { Truck } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { JobCard } from "@/components/dashboard/job-card";
import type { DashboardJobView } from "@/types/jobs";
import { APP_ROUTES } from "@/lib/constants";

interface ActiveLoadsListProps {
  jobs: DashboardJobView[];
  onRefresh: () => void;
}

export function ActiveLoadsList({ jobs, onRefresh }: ActiveLoadsListProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="tv-section-header">Active Loads</h2>
        <Link
          href={APP_ROUTES.loads}
          className="tv-link text-[14px]"
        >
          See All
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="tv-empty-state">
          <div className="flex size-20 items-center justify-center rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10">
            <Truck
              className="size-10 text-[var(--color-accent)]"
              strokeWidth={2}
              aria-hidden
            />
          </div>
          <h3 className="mt-4 text-xl font-bold text-[var(--color-text-primary)]">
            No loads detected.
          </h3>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--color-text-secondary)]/60">
            Start tracking your journey. Every mile logged is progress verified.
          </p>
          <Link href={APP_ROUTES.newJob} className="mt-6 w-full">
            <TvButton>Start New Load</TvButton>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onAction={onRefresh} />
          ))}
        </div>
      )}
    </section>
  );
}
