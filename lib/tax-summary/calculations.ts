import type { Expense, Job } from "@/types/jobs";
import { isExpenseInMonth } from "@/lib/dashboard/job-status";
import type { TaxDateRange } from "@/lib/tax-summary/date-ranges";
import { TRUCK_EXPENSE_CATEGORIES } from "@/lib/expenses/constants";
import { JOB_EXPENSE_CATEGORIES } from "@/lib/job-folder/constants";

export interface ExpenseCategoryTotal {
  category: string;
  amount: number;
}

export interface MonthlyIncomeTotal {
  label: string;
  amount: number;
}

export interface JobSummaryRow {
  jobId: string;
  jobName: string;
  completionDate: string;
  revenue: number;
  expenses: number;
  net: number;
}

export interface TaxSummaryData {
  range: TaxDateRange;
  totalEarned: number;
  totalExpenses: number;
  netIncome: number;
  milesDriven: number;
  bestMonth: { label: string; amount: number } | null;
  monthlyIncome: MonthlyIncomeTotal[];
  expenseBreakdown: ExpenseCategoryTotal[];
  jobSummary: JobSummaryRow[];
  costPerMile: {
    revenuePerMile: number;
    costPerMile: number;
    netPerMile: number;
    totalMiles: number;
  };
}

const COMPLETED_STATUSES = new Set([
  "paid",
  "complete",
  "completed",
  "awaiting_payment",
]);

const KNOWN_TAX_EXPENSE_CATEGORIES = new Set<string>([
  ...TRUCK_EXPENSE_CATEGORIES.map((category) => category.id),
  ...JOB_EXPENSE_CATEGORIES.map((category) => category.id),
]);

function jobInRange(job: Job, start: string, end: string): boolean {
  if (!COMPLETED_STATUSES.has(job.status)) return false;
  const date =
    job.payment_received_date ||
    job.delivery_date ||
    job.updated_at?.slice(0, 10) ||
    null;
  if (!date) return false;
  return date >= start && date <= end;
}

function hasGeneratedInvoice(job: Job): boolean {
  return Boolean(
    job.invoice_generated || job.invoice_url || job.invoice_number
  );
}

/** Invoice counts ignore job status; date uses invoice_sent_date, then updated_at. */
function invoiceGeneratedInRange(
  job: Job,
  start: string,
  end: string
): boolean {
  if (!hasGeneratedInvoice(job)) return false;
  const date =
    job.invoice_sent_date || job.updated_at?.slice(0, 10) || null;
  if (!date) return false;
  return date >= start && date <= end;
}

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function computeTaxSummaryData(
  jobs: Job[],
  expenses: Expense[],
  range: TaxDateRange
): TaxSummaryData {
  const { start, end } = range;

  const jobsInRange = jobs.filter((job) => jobInRange(job, start, end));

  const totalEarned = jobsInRange.reduce(
    (sum, job) => sum + (job.load_value ?? 0),
    0
  );

  const milesDriven = jobsInRange.reduce(
    (sum, job) => sum + (job.miles ?? 0),
    0
  );

  const totalExpenses = expenses
    .filter((expense) =>
      isExpenseInMonth(expense.expense_date, expense.created_at, start, end)
    )
    .reduce((sum, expense) => sum + expense.amount, 0);

  const categoryMap = new Map<string, number>();
  expenses
    .filter((expense) =>
      isExpenseInMonth(expense.expense_date, expense.created_at, start, end)
    )
    .forEach((expense) => {
      const key = expense.category || "other";
      if (!KNOWN_TAX_EXPENSE_CATEGORIES.has(key)) return;
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + expense.amount);
    });

  const expenseBreakdown = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const monthlyEarnings = new Map<string, number>();
  jobsInRange.forEach((job) => {
    const date =
      job.payment_received_date ||
      job.delivery_date ||
      job.updated_at?.slice(0, 10);
    if (!date) return;
    const key = date.slice(0, 7);
    monthlyEarnings.set(
      key,
      (monthlyEarnings.get(key) ?? 0) + (job.load_value ?? 0)
    );
  });

  let bestMonth: { label: string; amount: number } | null = null;
  monthlyEarnings.forEach((amount, key) => {
    if (!bestMonth || amount > bestMonth.amount) {
      bestMonth = { label: formatMonthLabel(key), amount };
    }
  });

  const monthlyIncome = Array.from(monthlyEarnings.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, amount]) => ({
      label: formatMonthLabel(key),
      amount,
    }));

  const jobSummary: JobSummaryRow[] = jobsInRange
    .map((job) => {
      const completionDate =
        job.payment_received_date ||
        job.delivery_date ||
        job.updated_at?.slice(0, 10) ||
        "";
      const jobExpenses = expenses
        .filter((expense) => expense.job_id === job.id)
        .filter((expense) =>
          isExpenseInMonth(expense.expense_date, expense.created_at, start, end)
        )
        .reduce((sum, expense) => sum + expense.amount, 0);
      const revenue = job.load_value ?? 0;
      return {
        jobId: job.id,
        jobName: job.job_name,
        completionDate,
        revenue,
        expenses: jobExpenses,
        net: revenue - jobExpenses,
      };
    })
    .sort((a, b) => b.completionDate.localeCompare(a.completionDate));

  const revenuePerMile = milesDriven > 0 ? totalEarned / milesDriven : 0;
  const costPerMile = milesDriven > 0 ? totalExpenses / milesDriven : 0;

  return {
    range,
    totalEarned,
    totalExpenses,
    netIncome: totalEarned - totalExpenses,
    milesDriven,
    bestMonth,
    monthlyIncome,
    expenseBreakdown,
    jobSummary,
    costPerMile: {
      revenuePerMile,
      costPerMile,
      netPerMile: revenuePerMile - costPerMile,
      totalMiles: milesDriven,
    },
  };
}

export function countTaxSummarySupportingDocs(
  jobs: Job[],
  expenses: Expense[],
  range: TaxDateRange
): { receiptsOnFile: number; invoicesGenerated: number } {
  const { start, end } = range;

  const receiptsOnFile = expenses.filter(
    (expense) =>
      Boolean(expense.receipt_url?.trim()) &&
      isExpenseInMonth(expense.expense_date, expense.created_at, start, end)
  ).length;

  const invoicesGenerated = jobs.filter((job) =>
    invoiceGeneratedInRange(job, start, end)
  ).length;

  return { receiptsOnFile, invoicesGenerated };
}
