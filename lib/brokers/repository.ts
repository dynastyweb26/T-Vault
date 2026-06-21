import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BrokerRecord,
  BrokerSearchResult,
  BrokerSource,
  FmcsaCarrierPayload,
} from "@/lib/brokers/types";

const BROKER_SELECT =
  "id, dot_number, mc_number, legal_name, dba_name, source, verified, created_at";

function toDisplayName(legalName: string, dbaName: string | null): string {
  if (dbaName && dbaName.toLowerCase() !== legalName.toLowerCase()) {
    return `${legalName} (${dbaName})`;
  }
  return legalName;
}

export function toBrokerSearchResult(row: BrokerRecord): BrokerSearchResult {
  return {
    id: row.id,
    legalName: row.legal_name,
    dbaName: row.dba_name,
    dotNumber: row.dot_number,
    mcNumber: row.mc_number,
    verified: row.verified,
    source: row.source,
    displayName: toDisplayName(row.legal_name, row.dba_name),
  };
}

export async function searchBrokersByName(
  supabase: SupabaseClient,
  query: string,
  limit = 20
): Promise<BrokerSearchResult[]> {
  const pattern = `%${query.replace(/[%_\\]/g, "\\$&")}%`;

  const { data, error } = await supabase
    .from("brokers")
    .select(BROKER_SELECT)
    .or(`legal_name.ilike.${pattern},dba_name.ilike.${pattern}`)
    .order("verified", { ascending: false })
    .order("legal_name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("broker local search failed:", error.message);
    throw new Error("broker_search_failed");
  }

  return ((data ?? []) as BrokerRecord[]).map(toBrokerSearchResult);
}

export async function searchBrokerByDot(
  supabase: SupabaseClient,
  dotNumber: string
): Promise<BrokerSearchResult | null> {
  const { data, error } = await supabase
    .from("brokers")
    .select(BROKER_SELECT)
    .eq("dot_number", dotNumber)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("broker dot lookup failed:", error.message);
    }
    return null;
  }

  return toBrokerSearchResult(data as BrokerRecord);
}

export async function searchBrokerByMcNumber(
  supabase: SupabaseClient,
  mcNumber: string
): Promise<BrokerSearchResult | null> {
  const { data, error } = await supabase
    .from("brokers")
    .select(BROKER_SELECT)
    .eq("mc_number", mcNumber)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("broker mc lookup failed:", error.message);
    }
    return null;
  }

  return toBrokerSearchResult(data as BrokerRecord);
}

function fmcsaRowFromCarrier(carrier: FmcsaCarrierPayload) {
  return {
    dot_number: carrier.dotNumber,
    mc_number: carrier.mcNumber,
    legal_name: carrier.legalName!,
    dba_name: carrier.dbaName,
    source: "fmcsa_lookup" as BrokerSource,
    verified: true,
  };
}

export async function upsertFmcsaBrokers(
  admin: SupabaseClient,
  carriers: FmcsaCarrierPayload[]
): Promise<BrokerSearchResult[]> {
  const results: BrokerSearchResult[] = [];

  for (const carrier of carriers) {
    if (!carrier.legalName) continue;

    const row = fmcsaRowFromCarrier(carrier);
    let saved: BrokerRecord | null = null;

    if (row.dot_number) {
      const { data, error } = await admin
        .from("brokers")
        .upsert(row, { onConflict: "dot_number" })
        .select(BROKER_SELECT)
        .single();

      if (!error && data) {
        saved = data as BrokerRecord;
      } else if (error) {
        console.error("broker upsert by dot failed:", error.message);
      }
    }

    if (!saved && row.mc_number) {
      const { data, error } = await admin
        .from("brokers")
        .upsert(row, { onConflict: "mc_number" })
        .select(BROKER_SELECT)
        .single();

      if (!error && data) {
        saved = data as BrokerRecord;
      } else if (error) {
        console.error("broker upsert by mc failed:", error.message);
      }
    }

    if (!saved) {
      const { data, error } = await admin
        .from("brokers")
        .insert(row)
        .select(BROKER_SELECT)
        .single();

      if (!error && data) {
        saved = data as BrokerRecord;
      } else if (error) {
        console.error("broker insert failed:", error.message);
      }
    }

    if (saved) {
      results.push(toBrokerSearchResult(saved));
    }
  }

  return results;
}

export function mergeBrokerResults(
  primary: BrokerSearchResult[],
  secondary: BrokerSearchResult[]
): BrokerSearchResult[] {
  const seen = new Set<string>();
  const merged: BrokerSearchResult[] = [];

  for (const row of [...primary, ...secondary]) {
    const key =
      row.dotNumber ??
      row.mcNumber ??
      `${row.legalName.toLowerCase()}|${(row.dbaName ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return merged.slice(0, 20);
}

export async function findOrCreateManualBroker(
  admin: SupabaseClient,
  legalName: string
): Promise<BrokerSearchResult> {
  const name = legalName.trim();
  const escaped = name.replace(/"/g, '""');

  const { data: existingRows, error: lookupError } = await admin
    .from("brokers")
    .select(BROKER_SELECT)
    .or(`legal_name.ilike."${escaped}",dba_name.ilike."${escaped}"`)
    .order("verified", { ascending: false })
    .limit(1);

  if (lookupError) {
    console.error("manual broker lookup failed:", lookupError.message);
    throw new Error("broker_manual_failed");
  }

  const existing = existingRows?.[0];
  if (existing) {
    return toBrokerSearchResult(existing as BrokerRecord);
  }

  const { data, error } = await admin
    .from("brokers")
    .insert({
      legal_name: name,
      source: "manual_entry",
      verified: false,
    })
    .select(BROKER_SELECT)
    .single();

  if (error || !data) {
    console.error("manual broker insert failed:", error?.message);
    throw new Error("broker_manual_failed");
  }

  return toBrokerSearchResult(data as BrokerRecord);
}
