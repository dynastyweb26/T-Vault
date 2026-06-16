import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttentionItem,
  AwaitingPaymentItem,
  DashboardData,
  Expense,
  Job,
  Payment,
} from "@/types/jobs";
import type { UserProfile } from "@/types/database";
import {
  getMonthRange,
  getSameMonthLastYear,
  daysBetweenToday,
} from "@/lib/dashboard/format";
import {
  isExpenseInMonth,
  isJobCompletedInMonth,
  toDashboardJob,
  countRequiredDocs,
} from "@/lib/dashboard/job-status";
import { APP_ROUTES } from "@/lib/constants";

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

function buildAttentionItems(jobs: Job[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  jobs
    .filter((job) => job.status === "active")
    .forEach((job) => {
      const { complete, total } = countRequiredDocs(job);
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

function buildAwaitingPayments(
  jobs: Job[],
  payments: Payment[]
): AwaitingPaymentItem[] {
  const items: AwaitingPaymentItem[] = [];
  const jobMap = new Map(jobs.map((job) => [job.id, job]));

  payments
    .filter((payment) => payment.status === "pending" || !payment.received_date)
    .forEach((payment) => {
      const job = jobMap.get(payment.job_id);
      if (!job) return;

      const expectedDate = payment.expected_date || job.payment_expected_date;
      const daysOverdue = expectedDate ? daysBetweenToday(expectedDate) : 0;

      items.push({
        id: payment.id,
        jobId: job.id,
        jobName: job.job_name,
        amount: payment.amount ?? job.load_value ?? 0,
        expectedDate,
        daysOverdue: Math.max(daysOverdue, 0),
        isOverdue: daysOverdue > 0,
      });
    });

  jobs
    .filter(
      (job) =>
        job.status !== "cancelled" &&
        job.status !== "archived" &&
        !job.payment_received &&
        job.invoice_sent_date
    )
    .forEach((job) => {
      if (items.some((item) => item.jobId === job.id)) return;

      const expectedDate = job.payment_expected_date;
      const daysOverdue = expectedDate ? daysBetweenToday(expectedDate) : 0;

      items.push({
        id: `job-payment-${job.id}`,
        jobId: job.id,
        jobName: job.job_name,
        amount: job.load_value ?? 0,
        expectedDate: expectedDate ?? null,
        daysOverdue: Math.max(daysOverdue, 0),
        isOverdue: daysOverdue > 0,
      });
    });

  return items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return b.daysOverdue - a.daysOverdue;
  });
}

export async function fetchDashboardData(
  supabase: SupabaseClient,
  userId: string,
  profile: UserProfile | null
): Promise<DashboardData> {
  const { start, end } = getMonthRange();
  const lastYear = getSameMonthLastYear();

  const [jobsResult, expensesResult, paymentsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .neq("is_template", true)
      .order("updated_at", { ascending: false }),
    supabase.from("expenses").select("*").eq("user_id", userId),
    supabase.from("payments").select("*").eq("user_id", userId),
  ]);

  const jobs = (jobsResult.data ?? []) as Job[];
  const expenses = (expensesResult.data ?? []) as Expense[];
  const payments = (paymentsResult.data ?? []) as Payment[];

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

  const activeJobsRaw = jobs.filter((job) => job.status === "active");
  const activeJobs = activeJobsRaw.slice(0, 5).map(toDashboardJob);

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
    streakDays: profile?.streak_days ?? 1,
    expensesThisMonth,
    netSoFar: earnedThisMonth - expensesThisMonth,
    activeJobs,
    attentionItems: buildAttentionItems(jobs),
    awaitingPayments: buildAwaitingPayments(jobs, payments),
  };
}
