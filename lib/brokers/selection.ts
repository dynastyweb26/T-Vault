import { createClient } from "@/lib/supabase/client";

export type BrokerSelection = {
  brokerId: string | null;
  brokerName: string;
  verified: boolean;
};

export function brokerSelectionFromJob(
  job: { broker_id: string | null; broker_name: string | null },
  verified: boolean
): BrokerSelection {
  return {
    brokerId: job.broker_id,
    brokerName: job.broker_name ?? "",
    verified,
  };
}

export function isBrokerSelectionDirty(
  initial: BrokerSelection,
  current: BrokerSelection
): boolean {
  return (
    initial.brokerId !== current.brokerId ||
    initial.brokerName.trim() !== current.brokerName.trim() ||
    initial.verified !== current.verified
  );
}

export async function fetchBrokerVerified(brokerId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("brokers")
    .select("verified")
    .eq("id", brokerId)
    .maybeSingle();

  return data?.verified ?? false;
}
