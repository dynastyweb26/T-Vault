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
  const details = await fetchBrokerDetails(brokerId);
  return details.verified;
}

export async function fetchBrokerDetails(
  brokerId: string
): Promise<{ verified: boolean; dotNumber: string | null; phone: string | null }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("brokers")
    .select("verified, dot_number, phone")
    .eq("id", brokerId)
    .maybeSingle();

  return {
    verified: data?.verified ?? false,
    dotNumber: data?.dot_number ?? null,
    phone: data?.phone ?? null,
  };
}
