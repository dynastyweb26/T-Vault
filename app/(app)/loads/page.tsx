"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { JobCard } from "@/components/dashboard/job-card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { toDashboardJob, groupDocumentsByJob } from "@/lib/dashboard/job-status";
import { restoreLoadsScrollPosition } from "@/lib/job-folder/scroll";
import type { Job, JobDocument } from "@/types/jobs";
import { useNewJobSheet } from "@/components/providers/new-job-provider";

const PAGE_SIZE = 10;

export default function LoadsPage() {
  const { user } = useAuth();
  const { openSheet } = useNewJobSheet();
  const [jobs, setJobs] = useState<ReturnType<typeof toDashboardJob>[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreLoadsScrollPosition();
  }, []);

  const loadJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const supabase = createClient();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .neq("is_template", true)
      .in("status", ["active", "awaiting_payment", "cancelled"])
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      const jobList = data as Job[];
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .in(
          "job_id",
          jobList.map((j) => j.id)
        );

      const docsByJob = groupDocumentsByJob((docs ?? []) as JobDocument[]);
      setJobs(jobList.map((job) => toDashboardJob(job, docsByJob[job.id] ?? [])));
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, user]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <AppHeader title="My Loads" subtitle="Track every load and document" />

      {loading ? (
        <div className="tv-skeleton mt-6 h-40 rounded-[var(--radius-card)]" />
      ) : jobs.length === 0 ? (
        <section className="mt-10 flex flex-col items-center rounded-[var(--radius-card)] bg-[var(--color-surface)] px-6 py-10 text-center">
          <FolderOpen
            className="size-12 text-[var(--color-accent)]"
            strokeWidth={2}
            aria-hidden
          />
          <h2 className="tv-card-title mt-4">No loads yet</h2>
          <p className="mt-2 max-w-xs text-[16px] text-[var(--color-text-secondary)]">
            When you add a load, it will show up here with status, docs, and pay
            tracking.
          </p>
          <TvButton className="mt-6" onClick={() => openSheet()}>
            Create your first job
          </TvButton>
        </section>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onAction={loadJobs} />
          ))}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                className="text-[14px] text-[var(--color-accent)] disabled:text-[var(--color-text-muted)]"
              >
                Previous
              </button>
              <span className="text-[13px] text-[var(--color-text-muted)]">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() =>
                  setPage((value) => Math.min(totalPages - 1, value + 1))
                }
                className="text-[14px] text-[var(--color-accent)] disabled:text-[var(--color-text-muted)]"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
