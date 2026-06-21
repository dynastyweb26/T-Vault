export function buildFmcsaCompanySnapshotUrl(dotNumber: string): string {
  const url = new URL("https://safer.fmcsa.dot.gov/CompanySnapshot.aspx");
  url.searchParams.set("searchtype", "ANY");
  url.searchParams.set("query_type", "queryCarrierSnapshot");
  url.searchParams.set("query_string", dotNumber);
  return url.toString();
}
