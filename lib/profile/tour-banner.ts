import type { SupabaseClient } from "@supabase/supabase-js";

export async function dismissTourBanner(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("users")
    .update({
      tour_banner_dismissed: true,
    })
    .eq("id", userId)
    .select("tour_banner_dismissed")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (data.tour_banner_dismissed !== true) {
    return { ok: false, error: "tour_banner_dismissed not persisted" };
  }

  return { ok: true };
}

export function shouldShowTourBanner(
  profile: { tour_banner_dismissed?: boolean | null } | null
): boolean {
  if (!profile) return false;
  return profile.tour_banner_dismissed !== true;
}
