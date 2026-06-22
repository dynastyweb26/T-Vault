import type {
  BrokerDirectoryResult,
  BrokerSearchSource,
} from "@/lib/brokers/types";

export type BrokerDirectorySearchResponse = {
  results: BrokerDirectoryResult[];
  source: BrokerSearchSource;
};

export async function searchBrokerDirectory(
  query: string
): Promise<BrokerDirectorySearchResponse> {
  const params = new URLSearchParams({ query });
  const response = await fetch(`/api/brokers/directory/search?${params.toString()}`);

  if (response.status === 403) {
    throw new Error("pro_required");
  }

  if (response.status === 429) {
    return { results: [], source: "fmcsa_unavailable" };
  }

  if (!response.ok) {
    throw new Error("broker_directory_search_failed");
  }

  return response.json() as Promise<BrokerDirectorySearchResponse>;
}
