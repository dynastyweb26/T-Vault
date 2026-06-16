type ParsedField = {
  value: string | null;
  confidence: "high" | "medium" | "low";
};

export const PARSEABLE_DOC_TYPES = [
  "rate_confirmation",
  "bol",
  "pod",
] as const;

export type ParseableDocType = (typeof PARSEABLE_DOC_TYPES)[number];

export function isParseableDocType(type: string): type is ParseableDocType {
  return PARSEABLE_DOC_TYPES.includes(type as ParseableDocType);
}

export function normalizeParsedField(raw: unknown): ParsedField {
  if (!raw || typeof raw !== "object") {
    return { value: null, confidence: "low" };
  }
  const obj = raw as { value?: unknown; confidence?: unknown };
  const value =
    obj.value === null || obj.value === undefined || obj.value === ""
      ? null
      : String(obj.value).trim();
  const conf = String(obj.confidence ?? "low").toLowerCase();
  const confidence: ParsedField["confidence"] =
    conf === "high" || conf === "medium" ? conf : "low";
  return { value, confidence };
}

export function aggregateDocumentConfidence(
  fields: ParsedField[]
): "high" | "medium" | "low" {
  if (!fields.length) return "low";
  if (fields.every((f) => f.confidence === "high" && f.value)) return "high";
  if (
    fields.some((f) => f.confidence === "high" || f.confidence === "medium")
  ) {
    return "medium";
  }
  return "low";
}

const RATE_CON_KEYS = [
  "broker_name",
  "load_value",
  "pickup_location",
  "delivery_location",
  "pickup_date",
  "delivery_date",
  "miles",
  "rate_con_number",
  "payment_type",
  "factoring_company",
] as const;

const BOL_KEYS = [
  "pickup_location",
  "delivery_location",
  "bol_number",
  "shipper_name",
  "consignee_name",
  "pickup_date",
  "delivery_date",
] as const;

const POD_KEYS = [
  "delivery_date",
  "consignee_name",
  "delivery_address",
  "condition_notes",
  "bol_reference_number",
] as const;

export function normalizeExtractedDocument(
  documentType: ParseableDocType,
  raw: Record<string, unknown>
): Record<string, ParsedField> {
  if (documentType === "rate_confirmation") {
    const result: Record<string, ParsedField> = {};
    for (const key of RATE_CON_KEYS) {
      result[key] = normalizeParsedField(raw[key]);
    }
    return result;
  }

  if (documentType === "bol") {
    return {
      pickup_location: normalizeParsedField(
        raw.pickup_location ?? raw.pickup
      ),
      delivery_location: normalizeParsedField(
        raw.delivery_location ?? raw.delivery
      ),
      bol_number: normalizeParsedField(raw.bol_number),
      shipper_name: normalizeParsedField(raw.shipper_name ?? raw.shipper),
      consignee_name: normalizeParsedField(
        raw.consignee_name ?? raw.consignee
      ),
      pickup_date: normalizeParsedField(raw.pickup_date),
      delivery_date: normalizeParsedField(raw.delivery_date),
    };
  }

  const result: Record<string, ParsedField> = {};
  for (const key of POD_KEYS) {
    result[key] = normalizeParsedField(raw[key]);
  }
  return result;
}

export const RATE_CON_PROMPT = `Extract fields from this Rate Confirmation trucking document.
Return ONLY valid JSON, no markdown, no explanation:
{
  "broker_name": { "value": "", "confidence": "" },
  "load_value": { "value": "", "confidence": "" },
  "pickup_location": { "value": "", "confidence": "" },
  "delivery_location": { "value": "", "confidence": "" },
  "pickup_date": { "value": "", "confidence": "" },
  "delivery_date": { "value": "", "confidence": "" },
  "miles": { "value": "", "confidence": "" },
  "rate_con_number": { "value": "", "confidence": "" },
  "payment_type": { "value": "", "confidence": "" },
  "factoring_company": { "value": "", "confidence": "" }
}
Rules:
- load_value: total driver payment, numeric only, no $.
- miles: numeric only.
- dates: YYYY-MM-DD.
- locations: City, State format.
- payment_type: "direct" or "factoring" when identifiable.
- confidence for each field: high, medium, or low.
- If a field is not found: value null, confidence "low".
- Never guess.`;

export const BOL_PROMPT = `Extract fields from this Bill of Lading (BOL) trucking document.
Return ONLY valid JSON, no markdown, no explanation:
{
  "pickup_location": { "value": "", "confidence": "" },
  "delivery_location": { "value": "", "confidence": "" },
  "bol_number": { "value": "", "confidence": "" },
  "shipper_name": { "value": "", "confidence": "" },
  "consignee_name": { "value": "", "confidence": "" },
  "pickup_date": { "value": "", "confidence": "" },
  "delivery_date": { "value": "", "confidence": "" }
}
Rules:
- dates: YYYY-MM-DD.
- locations: City, State format.
- confidence for each field: high, medium, or low.
- If a field is not found: value null, confidence "low".
- Never guess.`;

export const POD_PROMPT = `Extract fields from this Proof of Delivery (POD) trucking document.
Return ONLY valid JSON, no markdown, no explanation:
{
  "delivery_date": { "value": "", "confidence": "" },
  "consignee_name": { "value": "", "confidence": "" },
  "delivery_address": { "value": "", "confidence": "" },
  "condition_notes": { "value": "", "confidence": "" },
  "bol_reference_number": { "value": "", "confidence": "" }
}
Rules:
- delivery_date: YYYY-MM-DD.
- condition_notes: delivery condition or damage notes if present.
- bol_reference_number: BOL number this POD references.
- confidence for each field: high, medium, or low.
- If a field is not found: value null, confidence "low".
- Never guess.`;

export function promptForDocumentType(
  documentType: ParseableDocType
): string {
  if (documentType === "rate_confirmation") return RATE_CON_PROMPT;
  if (documentType === "bol") return BOL_PROMPT;
  return POD_PROMPT;
}
