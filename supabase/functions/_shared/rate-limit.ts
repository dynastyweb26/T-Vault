import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function checkAiRateLimit(
  admin: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; count: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await admin
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    console.error("rate_check_failed:", error.message);
    return { allowed: false, count: RATE_LIMIT };
  }

  return { allowed: (count ?? 0) < RATE_LIMIT, count: count ?? 0 };
}

export async function recordAiUsage(
  admin: SupabaseClient,
  userId: string,
  voiceNoteId?: string
): Promise<void> {
  const { error } = await admin.from("ai_usage").insert({
    user_id: userId,
    document_id: voiceNoteId ?? null,
  });
  if (error) {
    console.error("ai_usage_insert_failed:", error.message);
  }
}

export { RATE_LIMIT };
