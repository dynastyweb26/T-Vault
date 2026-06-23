import type { SupabaseClient } from "@supabase/supabase-js";

export async function markVaultIntroSeen(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("users")
    .update({
      has_seen_vault_intro: true,
    })
    .eq("id", userId)
    .select("has_seen_vault_intro")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (data.has_seen_vault_intro !== true) {
    return { ok: false, error: "has_seen_vault_intro not persisted" };
  }

  return { ok: true };
}

export function shouldShowVaultIntroBanner(
  profile: { has_seen_vault_intro?: boolean | null } | null
): boolean {
  return profile?.has_seen_vault_intro !== true;
}
