import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense, Job } from "@/types/jobs";
import { computeCostPerMileData } from "@/lib/cost-per-mile/calculations";

export async function fetchCostPerMileData(
  supabase: SupabaseClient,
  userId: string
) {
  const [jobsResult, expensesResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .neq("is_template", true),
    supabase.from("expenses").select("*").eq("user_id", userId),
  ]);

  const jobs = (jobsResult.data ?? []) as Job[];
  const expenses = (expensesResult.data ?? []) as Expense[];

  return computeCostPerMileData(jobs, expenses);
}
