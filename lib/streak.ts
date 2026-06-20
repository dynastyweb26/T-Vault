import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getStreakMilestoneCrossed,
  type StreakMilestone,
} from "@/lib/streak-milestones";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const start = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export type StreakUpdateResult = {
  nextStreak: number;
  milestoneReached: StreakMilestone | null;
};

export async function updateStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<StreakUpdateResult> {
  const today = toDateString(new Date());

  const { data: profile, error } = await supabase
    .from("users")
    .select("last_active_date, streak_days")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { nextStreak: 0, milestoneReached: null };
  }

  const lastActive = profile.last_active_date as string | null;
  const currentStreak = profile.streak_days ?? 0;
  let nextStreak = currentStreak;

  if (!lastActive) {
    nextStreak = 1;
  } else if (lastActive === today) {
    nextStreak = currentStreak || 1;
  } else if (daysBetween(lastActive, today) === 1) {
    nextStreak = currentStreak + 1;
  } else if (daysBetween(lastActive, today) > 1) {
    nextStreak = 1;
  }

  await supabase
    .from("users")
    .update({
      last_active_date: today,
      streak_days: nextStreak,
    })
    .eq("id", userId);

  if (nextStreak === 30) {
    const { data: existing } = await supabase
      .from("milestones")
      .select("id")
      .eq("user_id", userId)
      .eq("milestone_type", "streak_30")
      .maybeSingle();

    if (!existing) {
      await supabase.from("milestones").insert({
        user_id: userId,
        milestone_type: "streak_30",
        achieved_at: new Date().toISOString(),
      });
    }
  }

  return {
    nextStreak,
    milestoneReached: getStreakMilestoneCrossed(currentStreak, nextStreak),
  };
}
