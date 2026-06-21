import type { SupabaseClient } from "@supabase/supabase-js";
import { createManualBroker } from "@/lib/brokers/client";
import { sanitizeText } from "@/lib/validation";

export type JobBrokerLink = {
  brokerName: string | null;
  brokerId: string | null;
};

export function normalizeBrokerName(
  raw: string | null | undefined
): string | null {
  const name = sanitizeText(raw ?? "");
  return name.length > 0 ? name : null;
}

export async function ensureJobBrokerLink(
  brokerName: string | null | undefined,
  brokerId: string | null | undefined
): Promise<JobBrokerLink> {
  const normalized = normalizeBrokerName(brokerName);

  if (!normalized) {
    return { brokerName: null, brokerId: null };
  }

  if (brokerId) {
    return { brokerName: normalized, brokerId };
  }

  const broker = await createManualBroker(normalized);

  return {
    brokerName: broker.displayName || normalized,
    brokerId: broker.id,
  };
}

export async function ensureJobHasBrokerId(
  supabase: SupabaseClient,
  userId: string,
  job: {
    id: string;
    broker_name: string | null;
    broker_id: string | null;
  }
): Promise<{ broker_id: string | null; broker_name: string | null } | null> {
  const normalized = normalizeBrokerName(job.broker_name);

  if (!normalized) {
    return {
      broker_id: job.broker_id,
      broker_name: job.broker_name,
    };
  }

  if (job.broker_id) {
    return {
      broker_id: job.broker_id,
      broker_name: normalized,
    };
  }

  let brokerId: string;
  try {
    const broker = await createManualBroker(normalized);
    brokerId = broker.id;
  } catch {
    return null;
  }

  const { data, error } = await supabase
    .from("jobs")
    .update({
      broker_id: brokerId,
      broker_name: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("user_id", userId)
    .select("broker_id, broker_name")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
