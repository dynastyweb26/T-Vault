import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense, Job } from "@/types/jobs";
import { computeCostPerMileData } from "@/lib/cost-per-mile/calculations";

const JOBS_SELECT =
  "id, job_name, status, load_value, miles, delivery_date, payment_received_date, updated_at";

const EXPENSES_SELECT =
  "id, job_id, amount, category, expense_date, created_at";

export async function fetchCostPerMileData(
  supabase: SupabaseClient,
  userId: string
) {
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
    throw new Error("cost_per_mile_fetch_failed");
  }

  const jobs = (jobsResult.data ?? []) as Job[];
  const expenses = (expensesResult.data ?? []) as Expense[];

  return computeCostPerMileData(jobs, expenses);
}
