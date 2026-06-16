import type { SupabaseClient } from "@supabase/supabase-js";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const start = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export async function updateStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const today = toDateString(new Date());

  const { data: profile, error } = await supabase
    .from("users")
    .select("last_active_date, streak_days")
    .eq("id", userId)
    .single();

  if (error || !profile) return;

  const lastActive = profile.last_active_date as string | null;
  const currentStreak = profile.streak_days ?? 0;
  let nextStreak = currentStreak;

  if (!lastActive) {
    nextStreak = 1;
  } else if (lastActive === today) {
    nextStreak = currentStreak || 1;
  } else if (daysBetween(lastActive, today) === 1) {
    nextStreak = currentStreak + 1;
  } else {
    nextStreak = 1;
  }

  await supabase
    .from("users")
    .update({
      last_active_date: today,
      streak_days: nextStreak,
    })
    .eq("id", userId);
}
