import type { AiConfidence, Job, JobDocument } from "@/types/jobs";
import { getDocument } from "@/lib/job-folder/documents";

export type ParsedField = {
  value: string | null;
  confidence: AiConfidence;
};

export type RateConParsedData = {
  broker_name: ParsedField;
  load_value: ParsedField;
  pickup_location: ParsedField;
  delivery_location: ParsedField;
  pickup_date: ParsedField;
  delivery_date: ParsedField;
  miles: ParsedField;
  rate_con_number: ParsedField;
  payment_type: ParsedField;
  factoring_company: ParsedField;
};

export type BolParsedData = {
  pickup_location: ParsedField;
  delivery_location: ParsedField;
  bol_number: ParsedField;
  shipper_name: ParsedField;
  consignee_name: ParsedField;
  pickup_date: ParsedField;
  delivery_date: ParsedField;
};

export type PodParsedData = {
  delivery_date: ParsedField;
  consignee_name: ParsedField;
  delivery_address: ParsedField;
  condition_notes: ParsedField;
  bol_reference_number: ParsedField;
};

export type ParsedDocumentData =
  | RateConParsedData
  | BolParsedData
  | PodParsedData;

export type ParsingStatus =
  | "pending"
  | "parsing"
  | "complete"
  | "failed"
  | "skipped";

export type CrossValidationConflict = {
  field: "pickup_location" | "delivery_location";
  rateConValue: string;
  bolValue: string;
};

export const PARSEABLE_DOC_TYPES = [
  "rate_confirmation",
  "bol",
  "pod",
] as const;
export type ParseableDocType = (typeof PARSEABLE_DOC_TYPES)[number];

export type JobFieldKey =
  | "broker_name"
  | "load_value"
  | "pickup_location"
  | "delivery_location"
  | "pickup_date"
  | "delivery_date"
  | "miles"
  | "payment_type"
  | "factoring_company";

export type JobFieldMap = Record<string, JobFieldKey | null>;

export const RATE_CON_JOB_FIELD_MAP: JobFieldMap = {
  broker_name: "broker_name",
  load_value: "load_value",
  pickup_location: "pickup_location",
  delivery_location: "delivery_location",
  pickup_date: "pickup_date",
  delivery_date: "delivery_date",
  miles: "miles",
  rate_con_number: null,
  payment_type: "payment_type",
  factoring_company: "factoring_company",
};

export const BOL_JOB_FIELD_MAP: JobFieldMap = {
  pickup_location: "pickup_location",
  delivery_location: "delivery_location",
  pickup_date: "pickup_date",
  delivery_date: "delivery_date",
  bol_number: null,
  shipper_name: null,
  consignee_name: null,
};

export const POD_JOB_FIELD_MAP: JobFieldMap = {
  delivery_date: "delivery_date",
  consignee_name: null,
  delivery_address: null,
  condition_notes: null,
  bol_reference_number: null,
};

export const REVIEW_FIELD_LABELS: Record<string, string> = {
  broker_name: "Broker Name",
  load_value: "Load Value",
  pickup_location: "Pickup Location",
  delivery_location: "Delivery Location",
  pickup_date: "Pickup Date",
  delivery_date: "Delivery Date",
  miles: "Miles",
  rate_con_number: "Rate Con #",
  payment_type: "Payment Type",
  factoring_company: "Factoring Company",
  bol_number: "BOL Number",
  shipper_name: "Shipper Name",
  consignee_name: "Consignee Name",
  delivery_address: "Delivery Address",
  condition_notes: "Condition Notes",
  bol_reference_number: "BOL Reference Number",
};

const DOC_TYPE_PRIORITY: Record<ParseableDocType, number> = {
  rate_confirmation: 0,
  bol: 1,
  pod: 2,
};

const JOB_FIELD_MAPS: Record<ParseableDocType, JobFieldMap> = {
  rate_confirmation: RATE_CON_JOB_FIELD_MAP,
  bol: BOL_JOB_FIELD_MAP,
  pod: POD_JOB_FIELD_MAP,
};

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
  const confidence: AiConfidence =
    conf === "high" || conf === "medium" ? conf : "low";
  return { value, confidence };
}

export function aggregateDocumentConfidence(
  fields: ParsedField[]
): AiConfidence {
  if (!fields.length) return "low";
  if (fields.every((f) => f.confidence === "high" && f.value)) return "high";
  if (
    fields.some((f) => f.confidence === "high" || f.confidence === "medium")
  ) {
    return "medium";
  }
  return "low";
}

function lowField(): ParsedField {
  return { value: null, confidence: "low" };
}

export function buildLowConfidenceParsedData(
  documentType: ParseableDocType
): ParsedDocumentData {
  if (documentType === "rate_confirmation") {
    return {
      broker_name: lowField(),
      load_value: lowField(),
      pickup_location: lowField(),
      delivery_location: lowField(),
      pickup_date: lowField(),
      delivery_date: lowField(),
      miles: lowField(),
      rate_con_number: lowField(),
      payment_type: lowField(),
      factoring_company: lowField(),
    };
  }

  if (documentType === "bol") {
    return {
      pickup_location: lowField(),
      delivery_location: lowField(),
      bol_number: lowField(),
      shipper_name: lowField(),
      consignee_name: lowField(),
      pickup_date: lowField(),
      delivery_date: lowField(),
    };
  }

  return {
    delivery_date: lowField(),
    consignee_name: lowField(),
    delivery_address: lowField(),
    condition_notes: lowField(),
    bol_reference_number: lowField(),
  };
}

export function parseRateConFields(raw: Record<string, unknown>): RateConParsedData {
  const keys = Object.keys(RATE_CON_JOB_FIELD_MAP) as Array<
    keyof RateConParsedData
  >;
  const result = {} as RateConParsedData;
  for (const key of keys) {
    result[key] = normalizeParsedField(raw[key]);
  }
  return result;
}

export function parseBolFields(raw: Record<string, unknown>): BolParsedData {
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

export function parsePodFields(raw: Record<string, unknown>): PodParsedData {
  const keys = Object.keys(POD_JOB_FIELD_MAP) as Array<keyof PodParsedData>;
  const result = {} as PodParsedData;
  for (const key of keys) {
    result[key] = normalizeParsedField(raw[key]);
  }
  return result;
}

export function parseDocumentFields(
  documentType: ParseableDocType,
  raw: Record<string, unknown>
): ParsedDocumentData {
  if (documentType === "rate_confirmation") return parseRateConFields(raw);
  if (documentType === "bol") return parseBolFields(raw);
  return parsePodFields(raw);
}

export function suggestJobName(
  broker: string | null,
  pickup: string | null,
  delivery: string | null
): string {
  const parts: string[] = [];
  if (broker?.trim()) parts.push(broker.trim());
  if (pickup?.trim() && delivery?.trim()) {
    parts.push(`${pickup.trim()} → ${delivery.trim()}`);
  } else if (pickup?.trim()) {
    parts.push(pickup.trim());
  }
  return parts.join(" · ") || "New Load";
}

/** Auto-generated new-load name: "Dallas → Memphis · Jun 12" */
export function formatNewLoadJobName(
  pickup: string | null,
  delivery: string | null,
  pickupDate: string | null
): string {
  const route =
    pickup?.trim() && delivery?.trim()
      ? `${pickup.trim()} → ${delivery.trim()}`
      : pickup?.trim() || delivery?.trim() || "";

  if (!route) return "";

  if (!pickupDate?.trim()) return route;

  const parsed = new Date(`${pickupDate.trim().slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return route;

  const formatted = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${route} · ${formatted}`;
}

function confidenceRank(confidence: AiConfidence): number {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  if (confidence === "low") return 1;
  return 0;
}

function shouldReplaceReviewField(
  current: { confidence: AiConfidence; value: string; sourcePriority: number },
  next: { confidence: AiConfidence; value: string; sourcePriority: number }
): boolean {
  if (next.sourcePriority < current.sourcePriority) return true;
  if (
    next.sourcePriority === current.sourcePriority &&
    confidenceRank(next.confidence) > confidenceRank(current.confidence)
  ) {
    return true;
  }
  return false;
}

export type JobReviewField = {
  key: JobFieldKey;
  label: string;
  value: string;
  confidence: AiConfidence;
};

export function buildJobReviewFields(
  job: Job,
  documents: JobDocument[]
): JobReviewField[] {
  const merged = new Map<
    JobFieldKey,
    JobReviewField & { sourcePriority: number }
  >();

  for (const docType of PARSEABLE_DOC_TYPES) {
    const doc = getDocument(documents, docType);
    if (!doc?.parsed_data || typeof doc.parsed_data !== "object") continue;

    const parsed = doc.parsed_data as Record<string, ParsedField>;
    const fieldMap = JOB_FIELD_MAPS[docType];
    const sourcePriority = DOC_TYPE_PRIORITY[docType];

    for (const [parsedKey, jobKey] of Object.entries(fieldMap)) {
      if (!jobKey) continue;

      const field = parsed[parsedKey];
      if (!field?.value && field?.confidence === "low") continue;

      const currentJobValue = job[jobKey];
      const displayValue =
        field?.value ??
        (currentJobValue !== null && currentJobValue !== undefined
          ? String(currentJobValue)
          : "");

      if (!displayValue && field?.confidence === "low") continue;

      const candidate = {
        key: jobKey,
        label: REVIEW_FIELD_LABELS[jobKey] ?? jobKey,
        value: displayValue,
        confidence: field?.confidence ?? "low",
        sourcePriority,
      };

      const existing = merged.get(jobKey);
      if (!existing || shouldReplaceReviewField(existing, candidate)) {
        merged.set(jobKey, candidate);
      }
    }
  }

  return Array.from(merged.values()).map(
    ({ sourcePriority: _sourcePriority, ...field }) => field
  );
}
