import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBrokerRatingAggregates } from "@/lib/brokers/aggregate-ratings";
import { executeBrokerSearch } from "@/lib/brokers/execute-search";
import { parseBrokerSearchInput } from "@/lib/brokers/query-parser";
import type { BrokerDirectoryResult } from "@/lib/brokers/types";
import { fetchUserHasProAccess } from "@/lib/pro-access";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const BROKER_DIRECTORY_MAX_ATTEMPTS = 40;
const BROKER_DIRECTORY_WINDOW_MS = 60 * 1000;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const hasPro = await fetchUserHasProAccess(supabase, user.id);
    if (!hasPro) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(
      `brokers-directory:${user.id}`,
      BROKER_DIRECTORY_MAX_ATTEMPTS,
      BROKER_DIRECTORY_WINDOW_MS
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseBrokerSearchInput(searchParams.get("query"));

    if (!parsed) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }

    const search = await executeBrokerSearch(supabase, parsed);
    const brokerIds = search.results.map((broker) => broker.id);

    const admin = createAdminClient();
    const aggregates = await fetchBrokerRatingAggregates(admin, brokerIds);

    const results: BrokerDirectoryResult[] = search.results.map((broker) => {
      const stats = aggregates.get(broker.id);
      return {
        ...broker,
        avgPaidOnTimeStars: stats?.avgPaidOnTimeStars ?? null,
        avgEaseOfWorkStars: stats?.avgEaseOfWorkStars ?? null,
        ratingCount: stats?.ratingCount ?? 0,
      };
    });

    return NextResponse.json({
      results,
      source: search.source,
    });
  } catch (err) {
    console.error("brokers directory search route error:", err);
    return NextResponse.json(
      { error: "broker_directory_search_failed" },
      { status: 500 }
    );
  }
}
