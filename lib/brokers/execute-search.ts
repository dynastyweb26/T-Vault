import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchFmcsaCarrierByDot,
  searchFmcsaCarrierByDocket,
  searchFmcsaCarriersByName,
} from "@/lib/brokers/fmcsa-client";
import type { BrokerSearchInput } from "@/lib/brokers/query-parser";
import {
  mergeBrokerResults,
  searchBrokerByDot,
  searchBrokerByMcNumber,
  searchBrokersByName,
  upsertFmcsaBrokers,
} from "@/lib/brokers/repository";
import type { BrokerSearchResult, BrokerSearchSource } from "@/lib/brokers/types";

export type BrokerSearchResponse = {
  results: BrokerSearchResult[];
  source: BrokerSearchSource;
};

async function lookupFmcsaBrokers(
  carriers: Awaited<ReturnType<typeof searchFmcsaCarriersByName>>
): Promise<BrokerSearchResult[]> {
  const admin = createAdminClient();
  return upsertFmcsaBrokers(admin, carriers);
}

export async function executeBrokerSearch(
  supabase: SupabaseClient,
  parsed: BrokerSearchInput
): Promise<BrokerSearchResponse> {
  if (parsed.kind === "dot") {
    let cachedResult: BrokerSearchResult | null = null;
    try {
      cachedResult = await searchBrokerByDot(supabase, parsed.dotNumber);
    } catch (err) {
      console.error("broker local dot search failed:", err);
    }

    if (cachedResult) {
      return { results: [cachedResult], source: "cache" };
    }

    try {
      const carriers = await searchFmcsaCarrierByDot(parsed.dotNumber);
      const fmcsaResults = await lookupFmcsaBrokers(carriers);
      return { results: fmcsaResults, source: "fmcsa" };
    } catch (err) {
      console.error("broker FMCSA dot lookup unavailable:", err);
      return { results: [], source: "fmcsa_unavailable" };
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
      return { results: [cachedResult], source: "cache" };
    }

    try {
      const carriers = await searchFmcsaCarrierByDocket(parsed.docketNumber);
      const fmcsaResults = await lookupFmcsaBrokers(carriers);
      return { results: fmcsaResults, source: "fmcsa" };
    } catch (err) {
      console.error("broker FMCSA docket lookup unavailable:", err);
      return { results: [], source: "fmcsa_unavailable" };
    }
  }

  let cachedResults: BrokerSearchResult[] = [];
  try {
    cachedResults = await searchBrokersByName(supabase, parsed.query);
  } catch (err) {
    console.error("broker local search failed:", err);
  }

  if (cachedResults.length > 0) {
    return { results: cachedResults, source: "cache" };
  }

  try {
    const carriers = await searchFmcsaCarriersByName(parsed.query);
    const fmcsaResults = await lookupFmcsaBrokers(carriers);
    return {
      results: mergeBrokerResults(cachedResults, fmcsaResults),
      source: "fmcsa",
    };
  } catch (err) {
    console.error("broker FMCSA lookup unavailable:", err);
    return { results: [], source: "fmcsa_unavailable" };
  }
}
