import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchFmcsaCarrierByDot,
  searchFmcsaCarrierByDocket,
  searchFmcsaCarriersByName,
} from "@/lib/brokers/fmcsa-client";
import { parseBrokerSearchInput } from "@/lib/brokers/query-parser";
import {
  mergeBrokerResults,
  searchBrokerByDot,
  searchBrokerByMcNumber,
  searchBrokersByName,
  upsertFmcsaBrokers,
} from "@/lib/brokers/repository";
import type { BrokerSearchResult } from "@/lib/brokers/types";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const BROKER_SEARCH_MAX_ATTEMPTS = 40;
const BROKER_SEARCH_WINDOW_MS = 60 * 1000;

async function lookupFmcsaBrokers(
  carriers: Awaited<ReturnType<typeof searchFmcsaCarriersByName>>
): Promise<BrokerSearchResult[]> {
  const admin = createAdminClient();
  return upsertFmcsaBrokers(admin, carriers);
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
    const parsed = parseBrokerSearchInput(searchParams.get("query"));

    if (!parsed) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }

    if (parsed.kind === "dot") {
      let cachedResult: BrokerSearchResult | null = null;
      try {
        cachedResult = await searchBrokerByDot(supabase, parsed.dotNumber);
      } catch (err) {
        console.error("broker local dot search failed:", err);
      }

      if (cachedResult) {
        return NextResponse.json({
          results: [cachedResult],
          source: "cache",
        });
      }

      try {
        const carriers = await searchFmcsaCarrierByDot(parsed.dotNumber);
        const fmcsaResults = await lookupFmcsaBrokers(carriers);

        return NextResponse.json({
          results: fmcsaResults,
          source: "fmcsa",
        });
      } catch (err) {
        const reason =
          err instanceof Error && err.name === "TimeoutError"
            ? "timeout"
            : "lookup_failed";
        console.error("broker FMCSA dot lookup unavailable:", { reason, err });

        return NextResponse.json({
          results: [],
          source: "fmcsa_unavailable",
        });
      }
    }

    if (parsed.kind === "docket") {
      let cachedResult: BrokerSearchResult | null = null;
      try {
        cachedResult = await searchBrokerByMcNumber(supabase, parsed.docketNumber);
      } catch (err) {
        console.error("broker local mc search failed:", err);
      }

      if (cachedResult) {
        return NextResponse.json({
          results: [cachedResult],
          source: "cache",
        });
      }

      try {
        const carriers = await searchFmcsaCarrierByDocket(parsed.docketNumber);
        const fmcsaResults = await lookupFmcsaBrokers(carriers);

        return NextResponse.json({
          results: fmcsaResults,
          source: "fmcsa",
        });
      } catch (err) {
        const reason =
          err instanceof Error && err.name === "TimeoutError"
            ? "timeout"
            : "lookup_failed";
        console.error("broker FMCSA docket lookup unavailable:", { reason, err });

        return NextResponse.json({
          results: [],
          source: "fmcsa_unavailable",
        });
      }
    }

    let cachedResults: BrokerSearchResult[] = [];
    try {
      cachedResults = await searchBrokersByName(supabase, parsed.query);
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
      const carriers = await searchFmcsaCarriersByName(parsed.query);
      const fmcsaResults = await lookupFmcsaBrokers(carriers);

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
