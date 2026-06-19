import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense, Job } from "@/types/jobs";
import { computeTaxSummaryData } from "@/lib/tax-summary/calculations";
import type { TaxDateRange } from "@/lib/tax-summary/date-ranges";
import type { TaxSummaryData } from "@/lib/tax-summary/calculations";

const JOBS_SELECT =
  "id, job_name, status, load_value, miles, delivery_date, payment_received_date, updated_at, broker_name, pickup_location, delivery_location";

const EXPENSES_SELECT =
  "id, job_id, amount, category, expense_date, created_at, description";

export interface TaxSummaryQueryResult {
  summary: TaxSummaryData;
  jobs: Job[];
  expenses: Expense[];
}

export async function fetchTaxSummaryData(
  supabase: SupabaseClient,
  userId: string,
  range: TaxDateRange
): Promise<TaxSummaryQueryResult> {
  const [jobsResult, expensesResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(JOBS_SELECT)
      .eq("user_id", userId)
      .neq("is_template", true)
      .is("deleted_at", null),
    supabase
      .from("expenses")
      .select(EXPENSES_SELECT)
      .eq("user_id", userId),
  ]);

  if (jobsResult.error || expensesResult.error) {
    throw new Error("tax_summary_fetch_failed");
  }

  const jobs = (jobsResult.data ?? []) as Job[];
  const expenses = (expensesResult.data ?? []) as Expense[];

  return {
    summary: computeTaxSummaryData(jobs, expenses, range),
    jobs,
    expenses,
  };
}
