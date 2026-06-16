import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/types/jobs";
import type { UserProfile } from "@/types/database";

const DEFAULT_FUEL_COST_PER_MILE = 0.6;

export async function getUserAvgFuelCostPerMile(
  supabase: SupabaseClient,
  userId: string,
  profile?: UserProfile | null
): Promise<number> {
  if (profile?.cost_per_mile && profile.cost_per_mile > 0) {
    return profile.cost_per_mile;
  }

  const { data: fuelExpenses } = await supabase
    .from("expenses")
    .select("amount, job_id, jobs(miles)")
    .eq("user_id", userId)
    .eq("category", "fuel");

  if (!fuelExpenses?.length) return DEFAULT_FUEL_COST_PER_MILE;

  let totalFuel = 0;
  let totalMiles = 0;

  for (const exp of fuelExpenses) {
    totalFuel += Number(exp.amount) || 0;
    const job = exp.jobs as { miles?: number | null } | null;
    if (job?.miles && job.miles > 0) {
      totalMiles += job.miles;
    }
  }

  if (totalMiles > 0) return totalFuel / totalMiles;
  return DEFAULT_FUEL_COST_PER_MILE;
}

export function calculateProfitabilityScore(
  loadValue: number | null,
  miles: number | null,
  fuelCostPerMile: number
): number | null {
  if (!loadValue || !miles || miles <= 0) return null;
  const estimatedFuelCost = miles * fuelCostPerMile;
  return (loadValue - estimatedFuelCost) / miles;
}

export async function updateJobProfitability(
  supabase: SupabaseClient,
  job: Pick<Job, "id" | "load_value" | "miles">,
  userId: string,
  profile?: UserProfile | null
): Promise<number | null> {
  if (!job.miles || job.miles <= 0) return null;

  const fuelCostPerMile = await getUserAvgFuelCostPerMile(
    supabase,
    userId,
    profile
  );
  const score = calculateProfitabilityScore(
    job.load_value,
    job.miles,
    fuelCostPerMile
  );

  if (score === null) return null;

  await supabase
    .from("jobs")
    .update({
      profitability_score: score,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return score;
}
