import type { AiConfidence } from "@/types/jobs";
import {
  aggregateDocumentConfidence,
  formatNewLoadJobName,
  parseRateConFields,
  type RateConParsedData,
} from "@/lib/job-folder/ai-types";

export type NewLoadScanFieldKey =
  | "jobName"
  | "rateConNumber"
  | "loadValue"
  | "brokerName"
  | "pickupLocation"
  | "deliveryLocation"
  | "pickupDate"
  | "deliveryDate"
  | "miles"
  | "paymentType"
  | "factoringCompany";

export type NewLoadScanFormValues = {
  jobName: string;
  rateConNumber: string;
  bolNumber: string;
  loadValue: string;
  brokerName: string;
  pickupLocation: string;
  pickupFacility: string;
  deliveryLocation: string;
  deliveryFacility: string;
  pickupDate: string;
  deliveryDate: string;
  paymentType: "direct" | "factoring";
  factoringCompany: string;
  miles: string;
};

export type NewLoadScanResult = {
  formValues: Partial<NewLoadScanFormValues>;
  fieldConfidences: Partial<Record<NewLoadScanFieldKey, AiConfidence>>;
  parsedData: RateConParsedData;
  documentConfidence: AiConfidence;
};

const PARSED_TO_FORM: Record<
  keyof RateConParsedData,
  { key: NewLoadScanFieldKey; transform?: (value: string) => string }
> = {
  broker_name: { key: "brokerName" },
  load_value: {
    key: "loadValue",
    transform: (value) => value.replace(/[^0-9.]/g, ""),
  },
  pickup_location: { key: "pickupLocation" },
  delivery_location: { key: "deliveryLocation" },
  pickup_date: { key: "pickupDate" },
  delivery_date: { key: "deliveryDate" },
  miles: {
    key: "miles",
    transform: (value) => value.replace(/[^0-9.]/g, ""),
  },
  rate_con_number: { key: "rateConNumber" },
  payment_type: {
    key: "paymentType",
    transform: (value) =>
      value.toLowerCase() === "factoring" ? "factoring" : "direct",
  },
  factoring_company: { key: "factoringCompany" },
};

export function hasUsableRateConExtraction(parsed: RateConParsedData): boolean {
  return Object.values(parsed).some(
    (field) => Boolean(field.value) && field.confidence !== "low"
  );
}

export function applyRateConParsedToNewLoadForm(
  rawParsed: Record<string, unknown>
): NewLoadScanResult {
  const parsedData = parseRateConFields(rawParsed);
  const formValues: Partial<NewLoadScanFormValues> = {};
  const fieldConfidences: Partial<Record<NewLoadScanFieldKey, AiConfidence>> =
    {};

  for (const [parsedKey, mapping] of Object.entries(PARSED_TO_FORM) as Array<
    [keyof RateConParsedData, (typeof PARSED_TO_FORM)[keyof RateConParsedData]]
  >) {
    const field = parsedData[parsedKey];
    if (!field?.value) continue;

    const value = mapping.transform
      ? mapping.transform(field.value)
      : field.value;

    if (mapping.key === "paymentType") {
      formValues.paymentType = value as "direct" | "factoring";
    } else {
      (formValues as Record<string, string>)[mapping.key] = value;
    }

    fieldConfidences[mapping.key] = field.confidence;
  }

  const jobName = formatNewLoadJobName(
    formValues.pickupLocation ?? null,
    formValues.deliveryLocation ?? null,
    formValues.pickupDate ?? null
  );
  if (jobName) {
    formValues.jobName = jobName;
    const pickupConf = parsedData.pickup_location.confidence;
    const deliveryConf = parsedData.delivery_location.confidence;
    const dateConf = parsedData.pickup_date.confidence;
    const ranks = { high: 3, medium: 2, low: 1, unread: 0, manual: 0 };
    const jobNameConfidence = [pickupConf, deliveryConf, dateConf].reduce(
      (min, conf) => (ranks[conf] < ranks[min] ? conf : min),
      "high" as AiConfidence
    );
    fieldConfidences.jobName = jobNameConfidence;
  }

  return {
    formValues,
    fieldConfidences,
    parsedData,
    documentConfidence: aggregateDocumentConfidence(Object.values(parsedData)),
  };
}

export async function parseRateConPreview(file: File): Promise<
  | { ok: true; parsed: Record<string, unknown> }
  | { ok: false; rateLimited?: boolean; error?: string }
> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/documents/parse-rate-con-preview", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => ({}))) as {
    parsed?: Record<string, unknown>;
    rateLimited?: boolean;
    error?: string;
  };

  if (response.status === 429 || data.rateLimited) {
    return { ok: false, rateLimited: true };
  }

  if (!response.ok || !data.parsed) {
    return { ok: false, error: data.error ?? "parse_failed" };
  }

  return { ok: true, parsed: data.parsed };
}
