export function buildFmcsaCompanySnapshotUrl(dotNumber: string): string {
  const url = new URL("https://safer.fmcsa.dot.gov/query.asp");
  url.searchParams.set("searchtype", "ANY");
  url.searchParams.set("query_type", "queryCarrierSnapshot");
  url.searchParams.set("query_param", "USDOT");
  url.searchParams.set("query_string", dotNumber);
  return url.toString();
}
