import type { SupabaseClient } from "@supabase/supabase-js";

import type { DashboardJobView, Job, JobDocument } from "@/types/jobs";

import {

  toDashboardJob,

  groupDocumentsByJob,

} from "@/lib/dashboard/job-status";

import { daysBetweenToday } from "@/lib/dashboard/format";

import type { LoadsTabId } from "@/lib/loads/constants";

import {

  decodeJobCursor,

  DEFAULT_PAGE_SIZE,

  encodeJobCursor,

} from "@/lib/pagination/cursor";



const COMPLETED_STATUSES = ["paid", "complete", "completed"] as const;



export const LOADS_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export const LOADS_SEARCH_LIMIT = 50;

export function matchesLoadSearch(job: Job, query: string): boolean {

  const q = query.trim().toLowerCase();

  if (!q) return true;

  const fields = [

    job.job_name,

    job.broker_name,

    job.pickup_location,

    job.delivery_location,

  ];

  return fields.some((field) => field?.toLowerCase().includes(q));

}



export function sortAwaitingPaymentJobs(jobs: Job[]): Job[] {

  return [...jobs].sort((a, b) => {

    const aExpected = a.payment_expected_date;

    const bExpected = b.payment_expected_date;

    const aOverdue =

      aExpected && daysBetweenToday(aExpected) > 0 ? daysBetweenToday(aExpected) : 0;

    const bOverdue =

      bExpected && daysBetweenToday(bExpected) > 0 ? daysBetweenToday(bExpected) : 0;



    if (aOverdue !== bOverdue) return bOverdue - aOverdue;

    if (aExpected && bExpected) return aExpected.localeCompare(bExpected);

    if (aExpected) return -1;

    if (bExpected) return 1;

    return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");

  });

}



export function getCompletionDate(job: Job): string {

  return (

    job.payment_received_date ||

    job.delivery_date ||

    job.updated_at?.slice(0, 10) ||

    ""

  );

}



export interface FetchLoadsPageOptions {

  cursor?: string | null;

  limit?: number;

}



export interface LoadsPageResult {

  activeJobs: DashboardJobView[];

  awaitingJobs: Job[];

  completedJobs: Job[];

  docsByJob: Record<string, JobDocument[]>;

  nextCursor: string | null;

}



function applyJobCursor<T extends { or: (filters: string) => T }>(

  query: T,

  cursor: string | null | undefined

): T {

  if (!cursor) return query;

  const decoded = decodeJobCursor(cursor);

  if (!decoded) return query;

  return query.or(

    `updated_at.lt.${decoded.updatedAt},and(updated_at.eq.${decoded.updatedAt},id.lt.${decoded.id})`

  );

}



async function fetchDocumentsForJobs(

  supabase: SupabaseClient,

  userId: string,

  jobIds: string[]

): Promise<Record<string, JobDocument[]>> {

  if (!jobIds.length) return {};



  const { data, error } = await supabase

    .from("documents")

    .select("*")

    .eq("user_id", userId)

    .in("job_id", jobIds);



  if (error) throw new Error("loads_documents_fetch_failed");



  return groupDocumentsByJob((data ?? []) as JobDocument[]);

}

function buildLoadSearchOrFilter(term: string): string {
  const escaped = term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/"/g, '""');
  const pattern = `"%${escaped}%"`;
  return [
    `job_name.ilike.${pattern}`,
    `broker_name.ilike.${pattern}`,
    `pickup_location.ilike.${pattern}`,
    `delivery_location.ilike.${pattern}`,
  ].join(",");
}

function applyTabStatusFilter<T extends { eq: (col: string, val: string) => T; in: (col: string, vals: readonly string[]) => T }>(
  query: T,
  tab: LoadsTabId
): T {
  if (tab === "active") {
    return query.eq("status", "active") as T;
  }
  if (tab === "awaiting_payment") {
    return query.eq("status", "awaiting_payment") as T;
  }
  return query.in("status", [...COMPLETED_STATUSES]) as T;
}

function mapLoadsPageResult(
  tab: LoadsTabId,
  pageJobs: Job[],
  docsByJob: Record<string, JobDocument[]>,
  nextCursor: string | null
): LoadsPageResult {
  if (tab === "active") {
    return {
      activeJobs: pageJobs.map((job) =>
        toDashboardJob(job, docsByJob[job.id] ?? [])
      ),
      awaitingJobs: [],
      completedJobs: [],
      docsByJob,
      nextCursor,
    };
  }

  if (tab === "awaiting_payment") {
    return {
      activeJobs: [],
      awaitingJobs: sortAwaitingPaymentJobs(pageJobs),
      completedJobs: [],
      docsByJob,
      nextCursor,
    };
  }

  return {
    activeJobs: [],
    awaitingJobs: [],
    completedJobs: pageJobs,
    docsByJob,
    nextCursor,
  };
}

export async function searchLoads(
  supabase: SupabaseClient,
  userId: string,
  tab: LoadsTabId,
  query: string,
  limit = LOADS_SEARCH_LIMIT
): Promise<LoadsPageResult> {
  const term = query.trim();
  if (!term) {
    return {
      activeJobs: [],
      awaitingJobs: [],
      completedJobs: [],
      docsByJob: {},
      nextCursor: null,
    };
  }

  let jobsQuery = supabase
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .neq("is_template", true)
    .is("deleted_at", null);

  jobsQuery = applyTabStatusFilter(jobsQuery, tab)
    .or(buildLoadSearchOrFilter(term))
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  const { data, error } = await jobsQuery;
  if (error) throw new Error("loads_search_failed");

  const pageJobs = (data ?? []) as Job[];
  const jobIds = pageJobs.map((job) => job.id);
  const docsByJob = await fetchDocumentsForJobs(supabase, userId, jobIds);

  return mapLoadsPageResult(tab, pageJobs, docsByJob, null);
}

export async function fetchLoadsPage(

  supabase: SupabaseClient,

  userId: string,

  tab: LoadsTabId,

  options: FetchLoadsPageOptions = {}

): Promise<LoadsPageResult> {

  const limit = options.limit ?? LOADS_PAGE_SIZE;



  let query = supabase
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .neq("is_template", true)
    .is("deleted_at", null);

  query = applyTabStatusFilter(query, tab);

  query = applyJobCursor(query, options.cursor)

    .order("updated_at", { ascending: false })

    .order("id", { ascending: false })

    .limit(limit + 1);



  const { data, error } = await query;

  if (error) throw new Error("loads_fetch_failed");



  const rows = (data ?? []) as Job[];

  const hasMore = rows.length > limit;

  const pageJobs = hasMore ? rows.slice(0, limit) : rows;



  const jobIds = pageJobs.map((job) => job.id);

  const docsByJob = await fetchDocumentsForJobs(supabase, userId, jobIds);

  const lastJob = pageJobs[pageJobs.length - 1];
  const nextCursor =
    hasMore && lastJob?.updated_at
      ? encodeJobCursor(lastJob.updated_at, lastJob.id)
      : null;

  return mapLoadsPageResult(tab, pageJobs, docsByJob, nextCursor);
}


