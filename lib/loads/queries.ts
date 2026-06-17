import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job, JobDocument, Payment } from "@/types/jobs";
import {
  toDashboardJob,
  groupDocumentsByJob,
} from "@/lib/dashboard/job-status";
import { buildAwaitingPayments } from "@/lib/dashboard/awaiting-payment";
import { daysBetweenToday } from "@/lib/dashboard/format";

const COMPLETED_STATUSES = ["paid", "complete", "completed"] as const;

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

export async function fetchLoadsData(
  supabase: SupabaseClient,
  userId: string
) {
  const [jobsResult, documentsResult, paymentsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .neq("is_template", true)
      .order("updated_at", { ascending: false }),
    supabase.from("documents").select("*").eq("user_id", userId),
    supabase.from("payments").select("*").eq("user_id", userId),
  ]);

  if (jobsResult.error || documentsResult.error || paymentsResult.error) {
    throw new Error("loads_fetch_failed");
  }

  const jobs = (jobsResult.data ?? []) as Job[];
  const docsByJob = groupDocumentsByJob(
    (documentsResult.data ?? []) as JobDocument[]
  );
  const payments = (paymentsResult.data ?? []) as Payment[];

  const activeJobs = jobs
    .filter((job) => job.status === "active")
    .map((job) => toDashboardJob(job, docsByJob[job.id] ?? []));

  const awaitingJobs = sortAwaitingPaymentJobs(
    jobs.filter((job) => job.status === "awaiting_payment")
  );

  const awaitingItems = buildAwaitingPayments(jobs, payments);

  const completedJobs = jobs
    .filter((job) =>
      COMPLETED_STATUSES.includes(job.status as (typeof COMPLETED_STATUSES)[number])
    )
    .sort((a, b) => getCompletionDate(b).localeCompare(getCompletionDate(a)));

  return {
    activeJobs,
    awaitingJobs,
    awaitingItems,
    completedJobs,
    docsByJob,
  };
}
