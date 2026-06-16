import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense, Job } from "@/types/jobs";
import { computeTaxSummaryData } from "@/lib/tax-summary/calculations";
import type { TaxDateRange } from "@/lib/tax-summary/date-ranges";

export async function fetchTaxSummaryData(
  supabase: SupabaseClient,
  userId: string,
  range: TaxDateRange
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

  return computeTaxSummaryData(jobs, expenses, range);
}
