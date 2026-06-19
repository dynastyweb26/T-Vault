"use client";



import { useCallback, useEffect, useRef, useState } from "react";

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

import { fetchLoadsPage, searchLoads, sortAwaitingPaymentJobs } from "@/lib/loads/queries";

import { markJobAsPaid } from "@/lib/loads/mark-paid";

import { restoreLoadsScrollPosition } from "@/lib/job-folder/scroll";

import { onJobsChanged } from "@/lib/loads/job-events";

import type { DashboardJobView, Job, JobDocument } from "@/types/jobs";

import { useNewJobSheet } from "@/components/providers/new-job-provider";

import type { LoadsTabId } from "@/lib/loads/constants";



export default function LoadsPage() {

  const { user } = useAuth();

  const { openSheet } = useNewJobSheet();

  const [tab, setTab] = useState<LoadsTabId>("active");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const [activeJobs, setActiveJobs] = useState<DashboardJobView[]>([]);

  const [activeCursor, setActiveCursor] = useState<string | null>(null);

  const [activeLoaded, setActiveLoaded] = useState(false);



  const [awaitingJobs, setAwaitingJobs] = useState<Job[]>([]);

  const [awaitingCursor, setAwaitingCursor] = useState<string | null>(null);

  const [awaitingLoaded, setAwaitingLoaded] = useState(false);



  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);

  const [completedDocsByJob, setCompletedDocsByJob] = useState<

    Record<string, JobDocument[]>

  >({});

  const [completedCursor, setCompletedCursor] = useState<string | null>(null);

  const [completedLoaded, setCompletedLoaded] = useState(false);



  const [markingId, setMarkingId] = useState<string | null>(null);

  const [ratingJob, setRatingJob] = useState<Job | null>(null);

  const [ratingOpen, setRatingOpen] = useState(false);

  const isSearchActive = search.trim().length > 0;

  const applySearchPage = useCallback((targetTab: LoadsTabId, page: Awaited<ReturnType<typeof searchLoads>>) => {
    if (targetTab === "active") {
      setActiveJobs(page.activeJobs);
      setActiveCursor(null);
      setActiveLoaded(true);
    } else if (targetTab === "awaiting_payment") {
      setAwaitingJobs(page.awaitingJobs);
      setAwaitingCursor(null);
      setAwaitingLoaded(true);
    } else {
      setCompletedJobs(page.completedJobs);
      setCompletedDocsByJob(page.docsByJob);
      setCompletedCursor(null);
      setCompletedLoaded(true);
    }
  }, []);

  useEffect(() => {

    restoreLoadsScrollPosition();

  }, []);



  const loadTab = useCallback(

    async (targetTab: LoadsTabId, cursor?: string | null, append = false) => {

      if (!user) return;



      if (append) setLoadingMore(true);

      else setLoading(true);



      setError(null);



      try {

        const supabase = createClient();

        const page = await fetchLoadsPage(supabase, user.id, targetTab, {

          cursor: cursor ?? null,

        });



        if (targetTab === "active") {

          setActiveJobs((current) =>

            append ? [...current, ...page.activeJobs] : page.activeJobs

          );

          setActiveCursor(page.nextCursor);

          setActiveLoaded(true);

        } else if (targetTab === "awaiting_payment") {

          setAwaitingJobs((current) =>
            sortAwaitingPaymentJobs(
              append ? [...current, ...page.awaitingJobs] : page.awaitingJobs
            )
          );

          setAwaitingCursor(page.nextCursor);

          setAwaitingLoaded(true);

        } else {

          setCompletedJobs((current) =>

            append ? [...current, ...page.completedJobs] : page.completedJobs

          );

          setCompletedDocsByJob((current) =>

            append ? { ...current, ...page.docsByJob } : page.docsByJob

          );

          setCompletedCursor(page.nextCursor);

          setCompletedLoaded(true);

        }

      } catch {

        setError("We could not load your loads. Pull to refresh and try again.");

      } finally {

        setLoading(false);

        setLoadingMore(false);

      }

    },

    [user]

  );



  const reloadAllTabs = useCallback(async () => {
    if (!user) return;

    const term = search.trim();
    if (term) {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const page = await searchLoads(supabase, user.id, tab, term);
        applySearchPage(tab, page);
      } catch {
        setError("We could not load your loads. Pull to refresh and try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setActiveJobs([]);
    setActiveCursor(null);
    setActiveLoaded(false);
    setAwaitingJobs([]);
    setAwaitingCursor(null);
    setAwaitingLoaded(false);
    setCompletedJobs([]);
    setCompletedDocsByJob({});
    setCompletedCursor(null);
    setCompletedLoaded(false);
    await loadTab(tab);
  }, [applySearchPage, loadTab, search, tab, user]);

  const prevSearchRef = useRef(search);

  useEffect(() => {
    if (!user) return;

    const term = search.trim();
    if (term) {
      prevSearchRef.current = search;
      let cancelled = false;
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const supabase = createClient();
          const page = await searchLoads(supabase, user.id, tab, term);
          if (cancelled) return;
          applySearchPage(tab, page);
        } catch {
          if (!cancelled) {
            setError("We could not load your loads. Pull to refresh and try again.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const wasSearching = prevSearchRef.current.trim().length > 0;
    prevSearchRef.current = search;
    if (!wasSearching) return;

    setActiveLoaded(false);
    setAwaitingLoaded(false);
    setCompletedLoaded(false);
    setActiveCursor(null);
    setAwaitingCursor(null);
    setCompletedCursor(null);
    void loadTab(tab);
  }, [applySearchPage, loadTab, search, tab, user]);

  useEffect(() => {
    if (!user || isSearchActive) return;

    if (tab === "active" && !activeLoaded) void loadTab("active");

    if (tab === "awaiting_payment" && !awaitingLoaded) {

      void loadTab("awaiting_payment");

    }

    if (tab === "completed" && !completedLoaded) void loadTab("completed");

  }, [

    activeLoaded,

    awaitingLoaded,

    completedLoaded,

    loadTab,

    tab,

    user,

    isSearchActive,

  ]);



  useEffect(() => {

    return onJobsChanged(() => {

      void reloadAllTabs();

    });

  }, [reloadAllTabs]);



  const nextCursor = !isSearchActive
    ? tab === "active"
      ? activeCursor
      : tab === "awaiting_payment"
        ? awaitingCursor
        : completedCursor
    : null;



  const handleLoadMore = () => {
    if (isSearchActive || !nextCursor) return;

    void loadTab(tab, nextCursor, true);

  };



  const handleMarkPaid = async (job: Job) => {

    if (!user) return;

    setMarkingId(job.id);

    const supabase = createClient();

    const { job: updated, error: markError } = await markJobAsPaid(

      supabase,

      user.id,

      job.id

    );

    setMarkingId(null);



    if (markError || !updated) {

      setError("Could not mark this load as paid. Try again.");

      return;

    }



    setAwaitingLoaded(false);
    setCompletedLoaded(false);
    await reloadAllTabs();



    if (updated.broker_name?.trim() && !updated.broker_rating) {

      setRatingJob(updated);

      setRatingOpen(true);

    }

  };



  const emptyForTab =
    tab === "active"
      ? activeJobs.length === 0
      : tab === "awaiting_payment"
        ? awaitingJobs.length === 0
        : completedJobs.length === 0;



  const tabLoading =

    loading &&

    (tab === "active"

      ? !activeLoaded

      : tab === "awaiting_payment"

        ? !awaitingLoaded

        : !completedLoaded);



  return (

    <>

      <AppHeader title="My Loads" subtitle="Track every load and document" />



      <div className="mx-5 mt-4" data-tour="loads-search-tabs">

        <LoadsSearch onChange={setSearch} />

        <div className="mt-4">

          <LoadsSegmentTabs

            active={tab}

            onChange={(nextTab) => {

              setTab(nextTab);

            }}

          />

        </div>

      </div>



      {error ? (

        <div className="tv-error-state mx-5 mt-4 px-4 py-3">

          <p className="text-[14px]">{error}</p>

        </div>

      ) : null}



      {tabLoading ? (

        <div className="tv-skeleton mx-5 mt-6 h-40 rounded-2xl" />

      ) : emptyForTab ? (

        <section className="tv-empty-state mx-5 mt-10" data-tour="loads-job-card">

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

        <div className="mx-5 mt-4 flex flex-col gap-3 pb-8">

          {tab === "active"
            ? activeJobs.map((job, index) => (

                <JobCard

                  key={job.id}

                  job={job}

                  onAction={reloadAllTabs}

                  tourTarget={index === 0}

                />

              ))

            : null}



          {tab === "awaiting_payment"
            ? awaitingJobs.map((job) => (

                <AwaitingPaymentCard

                  key={job.id}

                  job={job}

                  marking={markingId === job.id}

                  onMarkPaid={handleMarkPaid}

                />

              ))

            : null}



          {tab === "completed"
            ? completedJobs.map((job) => (

                <CompletedLoadCard

                  key={job.id}

                  job={job}

                  documents={completedDocsByJob[job.id] ?? []}

                />

              ))

            : null}



          {nextCursor ? (

            <TvButton

              variant="secondary"

              disabled={loadingMore}

              onClick={handleLoadMore}

              className="mt-2"

            >

              {loadingMore ? "Loading..." : "Load more"}

            </TvButton>

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

        onSaved={reloadAllTabs}

      />

    </>

  );

}

