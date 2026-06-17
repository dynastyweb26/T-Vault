import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/database";
import type { MilestoneType } from "@/types/job-folder";
import { getMonthRange } from "@/lib/dashboard/format";

export interface MilestoneCheck {
  type: MilestoneType;
  title: string;
  subtitle: string;
}

const MILESTONE_COPY: Record<
  MilestoneType,
  { title: string; subtitle: string }
> = {
  first_load: {
    title: "First load documented!",
    subtitle: "You're building your business one load at a time.",
  },
  loads_10: {
    title: "10 loads strong!",
    subtitle: "Your operation is gaining momentum.",
  },
  loads_50: {
    title: "50 loads milestone!",
    subtitle: "You're running a real trucking business.",
  },
  loads_100: {
    title: "100 loads — centurion!",
    subtitle: "That's a serious track record.",
  },
  first_10k_month: {
    title: "$10K month unlocked!",
    subtitle: "You hit five figures in a single month.",
  },
  best_month: {
    title: "New best month!",
    subtitle: "You just beat your personal earnings record.",
  },
  streak_30: {
    title: "30-day streak!",
    subtitle: "A full month of showing up. That's a real habit.",
  },
};

export async function fetchAchievedMilestones(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<MilestoneType>> {
  const { data } = await supabase
    .from("milestones")
    .select("milestone_type")
    .eq("user_id", userId);

  return new Set(
    (data ?? []).map((row) => row.milestone_type as MilestoneType)
  );
}

export async function saveMilestone(
  supabase: SupabaseClient,
  userId: string,
  type: MilestoneType
): Promise<void> {
  await supabase.from("milestones").insert({
    user_id: userId,
    milestone_type: type,
    achieved_at: new Date().toISOString(),
  });
}

export function detectNewMilestones(
  profile: UserProfile,
  monthEarnings: number,
  achieved: Set<MilestoneType>
): MilestoneCheck[] {
  const loads = profile.total_lifetime_loads ?? 0;
  const checks: Array<{ type: MilestoneType; condition: boolean }> = [
    { type: "first_load", condition: loads === 1 },
    { type: "loads_10", condition: loads === 10 },
    { type: "loads_50", condition: loads === 50 },
    { type: "loads_100", condition: loads === 100 },
    {
      type: "first_10k_month",
      condition: monthEarnings >= 10_000 && !achieved.has("first_10k_month"),
    },
    {
      type: "best_month",
      condition:
        monthEarnings > (profile.best_month_earnings ?? 0) &&
        monthEarnings > 0 &&
        loads > 1,
    },
  ];

  return checks
    .filter(({ type, condition }) => condition && !achieved.has(type))
    .map(({ type }) => ({
      type,
      ...MILESTONE_COPY[type],
    }));
}

export async function updateUserStatsOnComplete(
  supabase: SupabaseClient,
  userId: string,
  loadValue: number
): Promise<UserProfile | null> {
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const { start, end } = getMonthRange();
  const { data: monthJobs } = await supabase
    .from("jobs")
    .select("load_value, delivery_date, updated_at, status")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("status", ["awaiting_payment", "paid", "complete", "completed"]);

  const monthEarnings = (monthJobs ?? []).reduce((sum, job) => {
    const date =
      job.delivery_date || job.updated_at?.slice(0, 10) || null;
    if (!date || date < start || date > end) return sum;
    return sum + (job.load_value ?? 0);
  }, loadValue);

  const nextLoads = (profile.total_lifetime_loads ?? 0) + 1;
  const nextEarnings = (profile.total_lifetime_earnings ?? 0) + loadValue;
  const isBestMonth = monthEarnings > (profile.best_month_earnings ?? 0);

  await supabase
    .from("users")
    .update({
      total_lifetime_loads: nextLoads,
      total_lifetime_earnings: nextEarnings,
      best_month_earnings: isBestMonth
        ? monthEarnings
        : profile.best_month_earnings,
      best_month_date: isBestMonth ? start : profile.best_month_date,
    })
    .eq("id", userId);

  const { data: updated } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return (updated as UserProfile) ?? null;
}
