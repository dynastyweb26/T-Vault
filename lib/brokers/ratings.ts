import type { SupabaseClient } from "@supabase/supabase-js";

export type BrokerStarRating = {
  id: string;
  broker_id: string;
  user_id: string;
  paid_on_time_stars: number;
  ease_of_work_stars: number;
  created_at: string;
  updated_at: string;
};

export type BrokerStarRatingInput = {
  brokerId: string;
  paidOnTimeStars: number;
  easeOfWorkStars: number;
};

function isValidStar(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export async function upsertBrokerStarRating(
  supabase: SupabaseClient,
  userId: string,
  input: BrokerStarRatingInput
): Promise<{ ok: true } | { ok: false }> {
  if (
    !input.brokerId ||
    !isValidStar(input.paidOnTimeStars) ||
    !isValidStar(input.easeOfWorkStars)
  ) {
    return { ok: false };
  }

  const { error } = await supabase.from("broker_ratings").upsert(
    {
      broker_id: input.brokerId,
      user_id: userId,
      paid_on_time_stars: input.paidOnTimeStars,
      ease_of_work_stars: input.easeOfWorkStars,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "broker_id,user_id" }
  );

  if (error) {
    console.error("broker star rating upsert failed:", error.message);
    return { ok: false };
  }

  return { ok: true };
}
