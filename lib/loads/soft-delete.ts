import type { SupabaseClient } from "@supabase/supabase-js";

const GENERIC_ERROR = "Could not delete this load. Try again.";

export async function softDeleteJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from("jobs")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    console.error("soft_delete_job failed:", error.message);
    return { ok: false, message: GENERIC_ERROR };
  }

  return { ok: true };
}

export async function restoreJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from("jobs")
    .update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) {
    console.error("restore_job failed:", error.message);
    return { ok: false, message: GENERIC_ERROR };
  }

  return { ok: true };
}

export async function purgeJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string
): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("user_id", userId);

  if (error) {
    console.error("purge_job failed:", error.message);
  }
}
