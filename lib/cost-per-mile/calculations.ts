import type { Expense, Job } from "@/types/jobs";
import { isExpenseInMonth } from "@/lib/dashboard/job-status";
import { getMonthRange } from "@/lib/dashboard/format";

export interface WeekRange {
  start: string;
  end: string;
  label: string;
}

export interface WeekMetrics {
  week: WeekRange;
  revenue: number;
  expenses: number;
  miles: number;
  earnedPerMile: number;
  costPerMile: number;
  netPerMile: number;
}

export interface LoadComparisonRow {
  jobId: string;
  jobName: string;
  miles: number;
  revenue: number;
  expenses: number;
  revenuePerMile: number;
  costPerMile: number;
  netPerMile: number;
}

export interface CostPerMileData {
  thisWeek: WeekMetrics;
  weeklyTrend: WeekMetrics[];
  thisMonth: {
    revenue: number;
    miles: number;
    expenses: number;
    revenuePerMile: number;
    costPerMile: number;
    netPerMile: number;
  };
  lastMonth: {
    revenue: number;
    miles: number;
    expenses: number;
    revenuePerMile: number;
    costPerMile: number;
    netPerMile: number;
  };
  loadComparison: LoadComparisonRow[];
  fuelCostPerMile: number;
  fuelReceiptCount: number;
}

const COMPLETED_STATUSES = new Set([
  "paid",
  "complete",
  "completed",
  "awaiting_payment",
]);

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(start: Date): string {
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getWeekRange(weeksAgo = 0, from = new Date()): WeekRange {
  const start = getWeekStart(from);
  start.setDate(start.getDate() - weeksAgo * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: formatWeekLabel(start),
  };
}

function isDateInRange(date: string | null, start: string, end: string): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

function jobDateInRange(job: Job, start: string, end: string): boolean {
  const date =
    job.payment_received_date ||
    job.delivery_date ||
    job.updated_at?.slice(0, 10) ||
    null;
  return isDateInRange(date, start, end);
}

function sumJobRevenue(jobs: Job[], start: string, end: string): number {
  return jobs
    .filter(
      (job) =>
        COMPLETED_STATUSES.has(job.status) && jobDateInRange(job, start, end)
    )
    .reduce((sum, job) => sum + (job.load_value ?? 0), 0);
}

function sumJobMiles(jobs: Job[], start: string, end: string): number {
  return jobs
    .filter(
      (job) =>
        COMPLETED_STATUSES.has(job.status) && jobDateInRange(job, start, end)
    )
    .reduce((sum, job) => sum + (job.miles ?? 0), 0);
}

function sumExpenses(expenses: Expense[], start: string, end: string): number {
  return expenses
    .filter((expense) =>
      isExpenseInMonth(expense.expense_date, expense.created_at, start, end)
    )
    .reduce((sum, expense) => sum + expense.amount, 0);
}

function perMile(total: number, miles: number): number {
  if (miles <= 0) return 0;
  return total / miles;
}

function buildWeekMetrics(
  week: WeekRange,
  jobs: Job[],
  expenses: Expense[]
): WeekMetrics {
  const revenue = sumJobRevenue(jobs, week.start, week.end);
  const miles = sumJobMiles(jobs, week.start, week.end);
  const expenseTotal = sumExpenses(expenses, week.start, week.end);
  const earnedPerMile = perMile(revenue, miles);
  const costPerMile = perMile(expenseTotal, miles);
  return {
    week,
    revenue,
    expenses: expenseTotal,
    miles,
    earnedPerMile,
    costPerMile,
    netPerMile: earnedPerMile - costPerMile,
  };
}

export function computeCostPerMileData(
  jobs: Job[],
  expenses: Expense[]
): CostPerMileData {
  const thisWeekRange = getWeekRange(0);
  const thisWeek = buildWeekMetrics(thisWeekRange, jobs, expenses);

  const weeklyTrend = Array.from({ length: 8 }, (_, index) => {
    const week = getWeekRange(7 - index);
    return buildWeekMetrics(week, jobs, expenses);
  });

  const thisMonthRange = getMonthRange();
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthRange = getMonthRange(lastMonthDate);

  const thisMonthRevenue = sumJobRevenue(
    jobs,
    thisMonthRange.start,
    thisMonthRange.end
  );
  const thisMonthMiles = sumJobMiles(
    jobs,
    thisMonthRange.start,
    thisMonthRange.end
  );
  const thisMonthExpenses = sumExpenses(
    expenses,
    thisMonthRange.start,
    thisMonthRange.end
  );

  const lastMonthRevenue = sumJobRevenue(
    jobs,
    lastMonthRange.start,
    lastMonthRange.end
  );
  const lastMonthMiles = sumJobMiles(
    jobs,
    lastMonthRange.start,
    lastMonthRange.end
  );
  const lastMonthExpenses = sumExpenses(
    expenses,
    lastMonthRange.start,
    lastMonthRange.end
  );

  const completedLoads = jobs
    .filter((job) => ["paid", "complete", "completed"].includes(job.status))
    .sort((a, b) => {
      const aDate = a.payment_received_date || a.delivery_date || "";
      const bDate = b.payment_received_date || b.delivery_date || "";
      return bDate.localeCompare(aDate);
    });

  const loadComparison: LoadComparisonRow[] = completedLoads.map((job) => {
    const miles = job.miles ?? 0;
    const revenue = job.load_value ?? 0;
    const jobExpenses = expenses
      .filter((expense) => expense.job_id === job.id)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const revenuePerMile = perMile(revenue, miles);
    const costPerMile = perMile(jobExpenses, miles);
    return {
      jobId: job.id,
      jobName: job.job_name,
      miles,
      revenue,
      expenses: jobExpenses,
      revenuePerMile,
      costPerMile,
      netPerMile: revenuePerMile - costPerMile,
    };
  });

  const fuelExpenses = expenses.filter((expense) => expense.category === "fuel");
  const fuelTotal = fuelExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const fuelMiles = completedLoads.reduce((sum, job) => sum + (job.miles ?? 0), 0);
  const fuelCostPerMile =
    fuelMiles > 0 && fuelTotal > 0 ? fuelTotal / fuelMiles : 0;

  return {
    thisWeek,
    weeklyTrend,
    thisMonth: {
      revenue: thisMonthRevenue,
      miles: thisMonthMiles,
      expenses: thisMonthExpenses,
      revenuePerMile: perMile(thisMonthRevenue, thisMonthMiles),
      costPerMile: perMile(thisMonthExpenses, thisMonthMiles),
      netPerMile:
        perMile(thisMonthRevenue, thisMonthMiles) -
        perMile(thisMonthExpenses, thisMonthMiles),
    },
    lastMonth: {
      revenue: lastMonthRevenue,
      miles: lastMonthMiles,
      expenses: lastMonthExpenses,
      revenuePerMile: perMile(lastMonthRevenue, lastMonthMiles),
      costPerMile: perMile(lastMonthExpenses, lastMonthMiles),
      netPerMile:
        perMile(lastMonthRevenue, lastMonthMiles) -
        perMile(lastMonthExpenses, lastMonthMiles),
    },
    loadComparison,
    fuelCostPerMile,
    fuelReceiptCount: fuelExpenses.length,
  };
}
