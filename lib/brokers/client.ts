import type { BrokerSearchResult, BrokerSearchSource } from "@/lib/brokers/types";

export type BrokerSearchResponse = {
  results: BrokerSearchResult[];
  source: BrokerSearchSource;
};

export async function searchBrokers(
  query: string
): Promise<BrokerSearchResponse> {
  const params = new URLSearchParams({ query });
  const response = await fetch(`/api/brokers/search?${params.toString()}`);

  if (response.status === 429) {
    return { results: [], source: "fmcsa_unavailable" };
  }

  if (!response.ok) {
    throw new Error("broker_search_failed");
  }

  return response.json() as Promise<BrokerSearchResponse>;
}

export async function createManualBroker(
  legalName: string
): Promise<BrokerSearchResult> {
  const response = await fetch("/api/brokers/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ legalName }),
  });

  if (!response.ok) {
    throw new Error("broker_manual_failed");
  }

  const data = (await response.json()) as { broker: BrokerSearchResult };
  return data.broker;
}
