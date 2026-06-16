"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { JobCard } from "@/components/dashboard/job-card";
import { LoadsSegmentTabs } from "@/components/loads/loads-segment-tabs";
import { LoadsSearch } from "@/components/loads/loads-search";
import { AwaitingPaymentCard } from "@/components/loads/awaiting-payment-card";
import { CompletedLoadCard } from "@/components/loads/completed-load-card";
import { BrokerRatingPrompt } from "@/components/broker-history/broker-rating-prompt";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchLoadsData, matchesLoadSearch } from "@/lib/loads/queries";
import { markJobAsPaid } from "@/lib/loads/mark-paid";
import { restoreLoadsScrollPosition } from "@/lib/job-folder/scroll";
import type { DashboardJobView, Job, JobDocument } from "@/types/jobs";
import { useNewJobSheet } from "@/components/providers/new-job-provider";
import type { LoadsTabId } from "@/lib/loads/constants";
import { COMPLETED_PAGE_SIZE } from "@/lib/loads/constants";

export default function LoadsPage() {
  const { user } = useAuth();
  const { openSheet } = useNewJobSheet();
  const [tab, setTab] = useState<LoadsTabId>("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeJobs, setActiveJobs] = useState<DashboardJobView[]>([]);
  const [awaitingJobs, setAwaitingJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [docsByJob, setDocsByJob] = useState<Record<string, JobDocument[]>>({});
  const [completedPage, setCompletedPage] = useState(0);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [ratingJob, setRatingJob] = useState<Job | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);

  useEffect(() => {
    restoreLoadsScrollPosition();
  }, []);

  const loadJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const data = await fetchLoadsData(supabase, user.id);
    setActiveJobs(data.activeJobs);
    setAwaitingJobs(data.awaitingJobs);
    setCompletedJobs(data.completedJobs);
    setDocsByJob(data.docsByJob);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredActive = useMemo(
    () => activeJobs.filter((job) => matchesLoadSearch(job, search)),
    [activeJobs, search]
  );

  const filteredAwaiting = useMemo(
    () => awaitingJobs.filter((job) => matchesLoadSearch(job, search)),
    [awaitingJobs, search]
  );

  const filteredCompleted = useMemo(
    () => completedJobs.filter((job) => matchesLoadSearch(job, search)),
    [completedJobs, search]
  );

  const completedTotalPages = Math.ceil(
    filteredCompleted.length / COMPLETED_PAGE_SIZE
  );
  const pagedCompleted = filteredCompleted.slice(
    completedPage * COMPLETED_PAGE_SIZE,
    (completedPage + 1) * COMPLETED_PAGE_SIZE
  );

  const handleMarkPaid = async (job: Job) => {
    if (!user) return;
    setMarkingId(job.id);
    const supabase = createClient();
    const updated = await markJobAsPaid(supabase, user.id, job.id);
    setMarkingId(null);
    await loadJobs();

    if (updated && updated.broker_name?.trim() && !updated.broker_rating) {
      setRatingJob(updated);
      setRatingOpen(true);
    }
  };

  const emptyForTab =
    tab === "active"
      ? filteredActive.length === 0
      : tab === "awaiting_payment"
        ? filteredAwaiting.length === 0
        : filteredCompleted.length === 0;

  return (
    <>
      <AppHeader title="My Loads" subtitle="Track every load and document" />

      <div className="mx-5 mt-4">
        <LoadsSearch
          onChange={(value) => {
            setSearch(value);
            setCompletedPage(0);
          }}
        />
      </div>

      <div className="mx-5 mt-4">
        <LoadsSegmentTabs
          active={tab}
          onChange={(nextTab) => {
            setTab(nextTab);
            setCompletedPage(0);
          }}
        />
      </div>

      {loading ? (
        <div className="tv-skeleton mx-5 mt-6 h-40 rounded-2xl" />
      ) : emptyForTab ? (
        <section className="tv-empty-state mx-5 mt-10">
          <FolderOpen
            className="size-12 text-[var(--color-accent)]"
            strokeWidth={2}
            aria-hidden
          />
          <h2 className="tv-card-title mt-4">No loads in this tab</h2>
          <p className="tv-body mt-2 max-w-xs text-[var(--color-text-secondary)]">
            {search
              ? "Try a different search term."
              : "When you add a load, it will show up here with status, docs, and pay tracking."}
          </p>
          {!search ? (
            <TvButton className="mt-6" onClick={() => openSheet()}>
              Create your first job
            </TvButton>
          ) : null}
        </section>
      ) : (
        <div className="mx-5 mt-4 flex flex-col gap-3">
          {tab === "active"
            ? filteredActive.map((job) => (
                <JobCard key={job.id} job={job} onAction={loadJobs} />
              ))
            : null}

          {tab === "awaiting_payment"
            ? filteredAwaiting.map((job) => (
                <AwaitingPaymentCard
                  key={job.id}
                  job={job}
                  marking={markingId === job.id}
                  onMarkPaid={handleMarkPaid}
                />
              ))
            : null}

          {tab === "completed" ? (
            <>
              {pagedCompleted.map((job) => (
                <CompletedLoadCard
                  key={job.id}
                  job={job}
                  documents={docsByJob[job.id] ?? []}
                />
              ))}
              {completedTotalPages > 1 ? (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={completedPage === 0}
                    onClick={() =>
                      setCompletedPage((value) => Math.max(0, value - 1))
                    }
                    className="tv-link tv-icon-btn min-w-20 text-[14px] disabled:text-[var(--color-text-muted)]"
                  >
                    Previous
                  </button>
                  <span className="tv-caption normal-case tracking-normal">
                    Page {completedPage + 1} of {completedTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={completedPage >= completedTotalPages - 1}
                    onClick={() =>
                      setCompletedPage((value) =>
                        Math.min(completedTotalPages - 1, value + 1)
                      )
                    }
                    className="tv-link tv-icon-btn min-w-20 text-[14px] disabled:text-[var(--color-text-muted)]"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}

      <BrokerRatingPrompt
        job={ratingJob}
        open={ratingOpen}
        onClose={() => {
          setRatingOpen(false);
          setRatingJob(null);
        }}
        onSaved={loadJobs}
      />
    </>
  );
}
