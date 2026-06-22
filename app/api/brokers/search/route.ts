import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeBrokerSearch } from "@/lib/brokers/execute-search";
import { parseBrokerSearchInput } from "@/lib/brokers/query-parser";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const BROKER_SEARCH_MAX_ATTEMPTS = 40;
const BROKER_SEARCH_WINDOW_MS = 60 * 1000;

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

    const rateLimit = await checkRateLimit(
      `brokers-search:${user.id}`,
      BROKER_SEARCH_MAX_ATTEMPTS,
      BROKER_SEARCH_WINDOW_MS
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

    return NextResponse.json({
      results: search.results,
      source: search.source,
    });
  } catch (err) {
    console.error("brokers search route error:", err);
    return NextResponse.json({ error: "broker_search_failed" }, { status: 500 });
  }
}
