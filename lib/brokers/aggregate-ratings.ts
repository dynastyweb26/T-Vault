import type { SupabaseClient } from "@supabase/supabase-js";

export type BrokerRatingAggregate = {
  brokerId: string;
  avgPaidOnTimeStars: number | null;
  avgEaseOfWorkStars: number | null;
  ratingCount: number;
};

type RatingRow = {
  broker_id: string;
  paid_on_time_stars: number;
  ease_of_work_stars: number;
};

export async function fetchBrokerRatingAggregates(
  admin: SupabaseClient,
  brokerIds: string[]
): Promise<Map<string, BrokerRatingAggregate>> {
  const aggregates = new Map<string, BrokerRatingAggregate>();

  if (brokerIds.length === 0) {
    return aggregates;
  }

  const { data, error } = await admin
    .from("broker_ratings")
    .select("broker_id, paid_on_time_stars, ease_of_work_stars")
    .in("broker_id", brokerIds);

  if (error) {
    console.error("broker rating aggregate fetch failed:", error.message);
    return aggregates;
  }

  const grouped = new Map<
    string,
    { paidTotal: number; easeTotal: number; count: number }
  >();

  for (const row of (data ?? []) as RatingRow[]) {
    const current = grouped.get(row.broker_id) ?? {
      paidTotal: 0,
      easeTotal: 0,
      count: 0,
    };
    current.paidTotal += row.paid_on_time_stars;
    current.easeTotal += row.ease_of_work_stars;
    current.count += 1;
    grouped.set(row.broker_id, current);
  }

  grouped.forEach((stats, brokerId) => {
    aggregates.set(brokerId, {
      brokerId,
      avgPaidOnTimeStars: stats.paidTotal / stats.count,
      avgEaseOfWorkStars: stats.easeTotal / stats.count,
      ratingCount: stats.count,
    });
  });

  return aggregates;
}
