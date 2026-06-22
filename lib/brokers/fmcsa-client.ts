import type { FmcsaCarrierPayload } from "@/lib/brokers/types";

const FMCSA_BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services";
const FMCSA_SEARCH_SIZE = 20;
const FMCSA_TIMEOUT_MS = 8_000;

function normalizeIdentifier(
  value: number | string | null | undefined
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTelephone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return null;
}

function extractCarrier(entry: unknown): FmcsaCarrierPayload | null {
  if (!entry || typeof entry !== "object") return null;

  const record = entry as Record<string, unknown>;
  const carrier =
    record.carrier && typeof record.carrier === "object"
      ? (record.carrier as Record<string, unknown>)
      : record;

  const legalName = normalizeName(
    typeof carrier.legalName === "string" ? carrier.legalName : null
  );
  if (!legalName) return null;

  return {
    dotNumber: carrier.dotNumber as number | string | null | undefined,
    mcNumber: carrier.mcNumber as number | string | null | undefined,
    legalName,
    dbaName: normalizeName(
      typeof carrier.dbaName === "string" ? carrier.dbaName : null
    ),
    phone: normalizeTelephone(
      typeof carrier.telephone === "string" ? carrier.telephone : null
    ),
  };
}

export function parseFmcsaNameSearchResponse(payload: unknown): FmcsaCarrierPayload[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const content = root.content;

  const entries = Array.isArray(content)
    ? content
    : content && typeof content === "object"
      ? [content]
      : [];

  const carriers: FmcsaCarrierPayload[] = [];

  for (const entry of entries) {
    const carrier = extractCarrier(entry);
    if (!carrier) continue;
    carriers.push({
      dotNumber: normalizeIdentifier(carrier.dotNumber),
      mcNumber: normalizeIdentifier(carrier.mcNumber),
      legalName: carrier.legalName,
      dbaName: carrier.dbaName,
      phone: carrier.phone ?? null,
    });
  }

  return carriers;
}

export function parseFmcsaSingleCarrierResponse(
  payload: unknown
): FmcsaCarrierPayload[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const carrier = extractCarrier(root.content ?? root);
  if (!carrier?.legalName) return [];

  return [
    {
      dotNumber: normalizeIdentifier(carrier.dotNumber),
      mcNumber: normalizeIdentifier(carrier.mcNumber),
      legalName: carrier.legalName,
      dbaName: carrier.dbaName,
      phone: carrier.phone ?? null,
    },
  ];
}

async function fetchFmcsaCarrier(url: URL): Promise<FmcsaCarrierPayload[]> {
  const webKey = process.env.FMCSA_API_KEY?.trim();
  if (!webKey) {
    console.error("FMCSA_API_KEY is not configured");
    throw new Error("fmcsa_not_configured");
  }

  url.searchParams.set("webKey", webKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FMCSA_TIMEOUT_MS),
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    console.error("FMCSA carrier lookup failed:", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("fmcsa_lookup_failed");
  }

  const payload = await response.json();
  return parseFmcsaSingleCarrierResponse(payload);
}

export async function searchFmcsaCarriersByName(
  query: string
): Promise<FmcsaCarrierPayload[]> {
  const webKey = process.env.FMCSA_API_KEY?.trim();
  if (!webKey) {
    console.error("FMCSA_API_KEY is not configured");
    throw new Error("fmcsa_not_configured");
  }

  const url = new URL(
    `${FMCSA_BASE_URL}/carriers/name/${encodeURIComponent(query)}`
  );
  url.searchParams.set("webKey", webKey);
  url.searchParams.set("size", String(FMCSA_SEARCH_SIZE));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FMCSA_TIMEOUT_MS),
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    console.error("FMCSA name search failed:", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("fmcsa_lookup_failed");
  }

  const payload = await response.json();
  return parseFmcsaNameSearchResponse(payload);
}

export async function searchFmcsaCarrierByDot(
  dotNumber: string
): Promise<FmcsaCarrierPayload[]> {
  const url = new URL(`${FMCSA_BASE_URL}/carriers/${encodeURIComponent(dotNumber)}`);
  return fetchFmcsaCarrier(url);
}

export async function searchFmcsaCarrierByDocket(
  docketNumber: string
): Promise<FmcsaCarrierPayload[]> {
  const url = new URL(
    `${FMCSA_BASE_URL}/carriers/docket-number/${encodeURIComponent(docketNumber)}/`
  );
  return fetchFmcsaCarrier(url);
}
