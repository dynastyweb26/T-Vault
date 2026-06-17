import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/database";

export const FREE_LOAD_LIMIT = 1;

export function canCreateJob(
  profile: UserProfile | null,
  jobCount: number
): boolean {
  if (!profile) return false;
  if (profile.pro_tier === "pro" || profile.pro_tier === "waitlist") {
    return true;
  }
  return jobCount < FREE_LOAD_LIMIT;
}

export async function joinProWaitlist(
  supabase: SupabaseClient,
  userId: string,
  email: string | null
): Promise<{ ok: boolean }> {
  const { error: insertError } = await supabase.from("pro_waitlist").upsert(
    { user_id: userId, email },
    { onConflict: "user_id" }
  );

  if (insertError) {
    console.error("pro_waitlist insert failed:", insertError.message);
    return { ok: false };
  }

  await supabase
    .from("users")
    .update({ pro_tier: "waitlist" })
    .eq("id", userId);

  return { ok: true };
}

export async function dismissUpgrade(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from("users")
    .update({ upgrade_dismissed_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function countUserJobs(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_template", false)
    .is("deleted_at", null);

  return count ?? 0;
}
