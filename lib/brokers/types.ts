export type BrokerSource = "fmcsa_lookup" | "manual_entry";

export type BrokerSearchSource =
  | "cache"
  | "fmcsa"
  | "fmcsa_unavailable";

export type BrokerRecord = {
  id: string;
  dot_number: string | null;
  mc_number: string | null;
  legal_name: string;
  dba_name: string | null;
  source: BrokerSource;
  verified: boolean;
  created_at: string;
};

export type BrokerSearchResult = {
  id: string;
  legalName: string;
  dbaName: string | null;
  dotNumber: string | null;
  mcNumber: string | null;
  verified: boolean;
  source: BrokerSource;
  displayName: string;
};

export type BrokerDirectoryResult = BrokerSearchResult & {
  avgPaidOnTimeStars: number | null;
  avgEaseOfWorkStars: number | null;
  ratingCount: number;
};

export type FmcsaCarrierPayload = {
  dotNumber?: number | string | null;
  mcNumber?: number | string | null;
  legalName?: string | null;
  dbaName?: string | null;
};
