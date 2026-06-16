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
        <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          Active Loads
        </h2>
        <Link
          href={APP_ROUTES.loads}
          className="text-[14px] text-[var(--color-accent)]"
        >
          See All
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-[var(--color-surface)] px-6 py-10 text-center">
          <Truck
            className="size-12 text-[var(--color-accent)]"
            strokeWidth={2}
            aria-hidden
          />
          <h3 className="mt-4 text-[18px] font-bold text-[var(--color-text-primary)]">
            Ready for your next load?
          </h3>
          <p className="mt-2 max-w-xs text-[15px] text-[var(--color-text-secondary)]">
            When you add a load, it shows up here with docs, pay status, and
            progress.
          </p>
          <Link href={APP_ROUTES.newJob} className="mt-6 w-full">
            <TvButton>Add a load</TvButton>
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
