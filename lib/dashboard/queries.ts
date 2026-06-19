import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttentionItem, DashboardData, Expense, Job, Payment } from "@/types/jobs";
import {
  isExpenseInMonth,
  isJobCompletedInMonth,
  toDashboardJob,
  groupDocumentsByJob,
} from "@/lib/dashboard/job-status";
import { buildAwaitingPayments } from "@/lib/dashboard/awaiting-payment";
import type { UserProfile } from "@/types/database";
import {
  getMonthRange,
  getSameMonthLastYear,
  daysBetweenToday,
} from "@/lib/dashboard/format";
import { countRequiredDocs } from "@/lib/job-folder/documents";
import type { JobDocument } from "@/types/jobs";
import { APP_ROUTES } from "@/lib/constants";

/** Columns used by dashboard aggregates, attention items, and awaiting payments. */
const DASHBOARD_JOBS_SELECT =
  "id, job_name, status, load_value, miles, delivery_date, payment_received_date, updated_at, payment_received, payment_expected_date, invoice_sent_date";

const DASHBOARD_EXPENSES_SELECT = "amount, expense_date, created_at";

const DASHBOARD_PAYMENTS_SELECT =
  "id, job_id, status, received_date, expected_date, amount";

/** Columns used by countRequiredDocs / isInvoiceGenerated on the dashboard. */
const DASHBOARD_DOCUMENTS_SELECT =
  "job_id, document_type, file_url, ai_confidence, manual_fields, parsed_data, upload_status";

function sumLoadValues(jobs: Job[]): number {
  return jobs.reduce((sum, job) => sum + (job.load_value ?? 0), 0);
}

function countMonthsWithEarnings(jobs: Job[]): number {
  const months = new Set<string>();
  jobs
    .filter((job) => job.status === "completed" && (job.load_value ?? 0) > 0)
    .forEach((job) => {
      const date = job.delivery_date || job.updated_at?.slice(0, 10);
      if (date) months.add(date.slice(0, 7));
    });
  return months.size;
}

function buildAttentionItems(
  jobs: Job[],
  docsByJob: Record<string, JobDocument[]>
): AttentionItem[] {
  const items: AttentionItem[] = [];

  jobs
    .filter((job) => job.status === "active")
    .forEach((job) => {
      const { complete, total } = countRequiredDocs(docsByJob[job.id] ?? []);
      if (complete < total) {
        items.push({
          id: `docs-${job.id}`,
          jobId: job.id,
          jobName: job.job_name,
          type: "missing_docs",
          message: `${total - complete} required doc${total - complete === 1 ? "" : "s"} missing`,
          href: `${APP_ROUTES.loads}/${job.id}`,
        });
      }

      const overdue =
        !job.payment_received &&
        job.payment_expected_date &&
        daysBetweenToday(job.payment_expected_date) > 0;

      if (overdue) {
        items.push({
          id: `overdue-${job.id}`,
          jobId: job.id,
          jobName: job.job_name,
          type: "overdue_invoice",
          message: `Payment ${daysBetweenToday(job.payment_expected_date!)} days overdue`,
          href: `${APP_ROUTES.loads}/${job.id}?section=payment`,
        });
      }
    });

  return items;
}

export async function fetchDashboardData(
  supabase: SupabaseClient,
  userId: string,
  profile: UserProfile | null
): Promise<DashboardData> {
  const { start, end } = getMonthRange();
  const lastYear = getSameMonthLastYear();

  const [jobsResult, expensesResult, paymentsResult, documentsResult, activeJobsDisplayResult] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(DASHBOARD_JOBS_SELECT)
        .eq("user_id", userId)
        .neq("is_template", true)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("expenses")
        .select(DASHBOARD_EXPENSES_SELECT)
        .eq("user_id", userId),
      supabase
        .from("payments")
        .select(DASHBOARD_PAYMENTS_SELECT)
        .eq("user_id", userId),
      supabase
        .from("documents")
        .select(DASHBOARD_DOCUMENTS_SELECT)
        .eq("user_id", userId),
      supabase
        .from("jobs")
        .select("*")
        .eq("user_id", userId)
        .neq("is_template", true)
        .is("deleted_at", null)
        .in("status", ["active", "awaiting_payment"])
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  const jobs = (jobsResult.data ?? []) as Job[];
  const expenses = (expensesResult.data ?? []) as Expense[];

  if (
    jobsResult.error ||
    expensesResult.error ||
    paymentsResult.error ||
    documentsResult.error ||
    activeJobsDisplayResult.error
  ) {
    throw new Error("dashboard_fetch_failed");
  }

  const payments = (paymentsResult.data ?? []) as Payment[];
  const docsByJob = groupDocumentsByJob(
    (documentsResult.data ?? []) as JobDocument[]
  );

  const completedThisMonth = jobs.filter((job) =>
    isJobCompletedInMonth(job, start, end)
  );
  const completedLastYearMonth = jobs.filter((job) =>
    isJobCompletedInMonth(job, lastYear.start, lastYear.end)
  );

  const earnedThisMonth = sumLoadValues(completedThisMonth);
  const earnedLastYearMonth = sumLoadValues(completedLastYearMonth);

  const yearOverYearHasData = earnedLastYearMonth > 0;
  const yearOverYearDiff = yearOverYearHasData
    ? earnedThisMonth - earnedLastYearMonth
    : null;

  const monthsWithData = countMonthsWithEarnings(jobs);
  let projectedAnnual: number | null = null;
  if (monthsWithData >= 3) {
    const totalCompleted = sumLoadValues(
      jobs.filter((job) => job.status === "completed")
    );
    projectedAnnual = Math.round((totalCompleted / monthsWithData) * 12);
  }

  const activeJobsRaw = jobs.filter(
    (job) => job.status === "active" || job.status === "awaiting_payment"
  );
  const activeJobs = (activeJobsDisplayResult.data ?? []).map((job) =>
    toDashboardJob(job as Job, docsByJob[job.id] ?? [])
  );

  const milesThisMonth = jobs
    .filter((job) => isJobCompletedInMonth(job, start, end))
    .reduce((sum, job) => sum + (job.miles ?? 0), 0);

  const expensesThisMonth = expenses
    .filter((expense) =>
      isExpenseInMonth(expense.expense_date, expense.created_at, start, end)
    )
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    earnedThisMonth,
    loadsCompletedThisMonth: completedThisMonth.length,
    yearOverYearDiff,
    yearOverYearHasData,
    projectedAnnual,
    activeLoadsCount: activeJobsRaw.length,
    totalMilesThisMonth: milesThisMonth,
    streakDays: profile?.streak_days ?? 0,
    expensesThisMonth,
    netSoFar: earnedThisMonth - expensesThisMonth,
    activeJobs,
    attentionItems: buildAttentionItems(jobs, docsByJob),
    awaitingPayments: buildAwaitingPayments(jobs, payments),
  };
}
