import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchFmcsaCarriersByName } from "@/lib/brokers/fmcsa-client";
import {
  mergeBrokerResults,
  searchBrokersByName,
  upsertFmcsaBrokers,
} from "@/lib/brokers/repository";
import type { BrokerSearchResult } from "@/lib/brokers/types";
import { TEXT_LIMITS } from "@/lib/constants";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validation";

const BROKER_SEARCH_MIN_LENGTH = 2;
const BROKER_SEARCH_MAX_ATTEMPTS = 40;
const BROKER_SEARCH_WINDOW_MS = 60 * 1000;

const BROKER_NAME_PATTERN = /^[\p{L}\p{N}\s&.,'\-/()]+$/u;

function validateBrokerSearchQuery(raw: string | null): string | null {
  const query = sanitizeText(raw ?? "");
  if (query.length < BROKER_SEARCH_MIN_LENGTH) return null;
  if (query.length > TEXT_LIMITS.broker) return null;
  if (!BROKER_NAME_PATTERN.test(query)) return null;
  return query;
}

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
    const query = validateBrokerSearchQuery(searchParams.get("query"));

    if (!query) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }

    let cachedResults: BrokerSearchResult[] = [];
    try {
      cachedResults = await searchBrokersByName(supabase, query);
    } catch (err) {
      console.error("broker local search failed:", err);
    }

    if (cachedResults.length > 0) {
      return NextResponse.json({
        results: cachedResults,
        source: "cache",
      });
    }

    try {
      const carriers = await searchFmcsaCarriersByName(query);
      const admin = createAdminClient();
      const fmcsaResults = await upsertFmcsaBrokers(admin, carriers);

      return NextResponse.json({
        results: mergeBrokerResults(cachedResults, fmcsaResults),
        source: "fmcsa",
      });
    } catch (err) {
      const reason =
        err instanceof Error && err.name === "TimeoutError"
          ? "timeout"
          : "lookup_failed";
      console.error("broker FMCSA lookup unavailable:", { reason, err });

      return NextResponse.json({
        results: [],
        source: "fmcsa_unavailable",
      });
    }
  } catch (err) {
    console.error("brokers search route error:", err);
    return NextResponse.json({ error: "broker_search_failed" }, { status: 500 });
  }
}
