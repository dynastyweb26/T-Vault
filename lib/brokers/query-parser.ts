import { TEXT_LIMITS } from "@/lib/constants";
import { sanitizeText } from "@/lib/validation";

const BROKER_SEARCH_MIN_LENGTH = 2;
const BROKER_NAME_PATTERN = /^[\p{L}\p{N}\s&.,'\-/()]+$/u;
const MC_PATTERN = /^MC\s*#?\s*(\d{2,8})$/i;
const DOT_PATTERN = /^DOT\s*#?\s*(\d{2,8})$/i;
const NUMERIC_PATTERN = /^\d{2,8}$/;

export type BrokerSearchInput =
  | { kind: "name"; query: string }
  | { kind: "dot"; dotNumber: string }
  | { kind: "docket"; docketNumber: string };

export function parseBrokerSearchInput(raw: string | null): BrokerSearchInput | null {
  const query = sanitizeText(raw ?? "");
  if (query.length < BROKER_SEARCH_MIN_LENGTH) return null;
  if (query.length > TEXT_LIMITS.broker) return null;

  const mcMatch = query.match(MC_PATTERN);
  if (mcMatch) {
    return { kind: "docket", docketNumber: mcMatch[1] };
  }

  const dotMatch = query.match(DOT_PATTERN);
  if (dotMatch) {
    return { kind: "dot", dotNumber: dotMatch[1] };
  }

  if (NUMERIC_PATTERN.test(query)) {
    return { kind: "dot", dotNumber: query };
  }

  if (!BROKER_NAME_PATTERN.test(query)) return null;
  return { kind: "name", query };
}
