import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/types/jobs";
import type { BrokerBadgeInfo, BrokerRating } from "@/types/job-folder";

export async function fetchBrokerRating(
  supabase: SupabaseClient,
  userId: string,
  brokerName: string | null
): Promise<BrokerRating | null> {
  if (!brokerName?.trim()) return null;

  const { data } = await supabase
    .from("broker_ratings")
    .select("*")
    .eq("user_id", userId)
    .eq("broker_name", brokerName.trim())
    .maybeSingle();

  return (data as BrokerRating | null) ?? null;
}

export async function fetchBrokerHistory(
  supabase: SupabaseClient,
  userId: string,
  brokerName: string,
  excludeJobId?: string
): Promise<Job[]> {
  let query = supabase
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("broker_name", brokerName.trim())
    .neq("is_template", true)
    .in("status", ["awaiting_payment", "paid", "complete", "completed"])
    .order("updated_at", { ascending: false })
    .limit(10);

  if (excludeJobId) query = query.neq("id", excludeJobId);

  const { data } = await query;
  return (data ?? []) as Job[];
}

export function buildBrokerBadge(
  rating: BrokerRating | null,
  historyCount: number
): BrokerBadgeInfo | null {
  if (!rating || historyCount === 0) return null;

  const total = rating.total_loads;
  if (total < 1) return null;

  const onTime = rating.on_time_count;
  const late = rating.late_count;
  const problems = rating.problem_count + rating.detention_unpaid_count;

  let tone: BrokerBadgeInfo["tone"] = "success";
  let label = `Paid on time ${onTime}/${total}`;

  if (problems > 0) {
    tone = "danger";
    label = `Payment problem on ${problems} load${problems === 1 ? "" : "s"}`;
  } else if (late > 0) {
    tone = "warning";
    label = `Paid late ${late}/${total} times`;
  } else if (onTime >= 3 && onTime === total) {
    tone = "success";
    label = `Paid on time ${onTime}/${total}`;
  } else if (total >= 3 && onTime === total) {
    tone = "success";
    label = `Paid on time ${onTime}/${total}`;
  } else if (total < 3) {
    return null;
  }

  return {
    tone,
    label,
    totalLoads: total,
    history: [],
  };
}

export async function updateBrokerRatingOnPayment(
  supabase: SupabaseClient,
  userId: string,
  brokerName: string | null,
  paidOnTime: boolean
): Promise<void> {
  if (!brokerName?.trim()) return;

  const existing = await fetchBrokerRating(supabase, userId, brokerName);

  if (existing) {
    await supabase
      .from("broker_ratings")
      .update({
        total_loads: existing.total_loads + 1,
        on_time_count: paidOnTime
          ? existing.on_time_count + 1
          : existing.on_time_count,
        late_count: paidOnTime
          ? existing.late_count
          : existing.late_count + 1,
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("broker_ratings").insert({
    user_id: userId,
    broker_name: brokerName.trim(),
    total_loads: 1,
    on_time_count: paidOnTime ? 1 : 0,
    late_count: paidOnTime ? 0 : 1,
    problem_count: 0,
    detention_unpaid_count: 0,
  });
}

export async function updateBrokerDetentionOutcome(
  supabase: SupabaseClient,
  userId: string,
  brokerName: string | null,
  outcome: "yes" | "no" | "waiting"
): Promise<void> {
  if (!brokerName?.trim()) return;

  const existing = await fetchBrokerRating(supabase, userId, brokerName);
  if (!existing) {
    await supabase.from("broker_ratings").insert({
      user_id: userId,
      broker_name: brokerName.trim(),
      total_loads: 0,
      on_time_count: 0,
      late_count: 0,
      problem_count: 0,
      detention_unpaid_count: outcome === "no" ? 1 : 0,
    });
    return;
  }

  if (outcome === "no") {
    await supabase
      .from("broker_ratings")
      .update({
        detention_unpaid_count: existing.detention_unpaid_count + 1,
        problem_count: existing.problem_count + 1,
      })
      .eq("id", existing.id);
  }
}
