import type { DocumentType } from "@/types/job-folder";
import type { Job, JobDocument } from "@/types/jobs";

export type ManualJobFieldKey =
  | "broker_name"
  | "load_value"
  | "pickup_location"
  | "delivery_location"
  | "pickup_date"
  | "delivery_date"
  | "miles";

export type ManualDocumentFieldKey =
  | "bol_number"
  | "shipper_name"
  | "consignee_name"
  | "delivery_address"
  | "condition_notes"
  | "bol_reference_number";

export type ManualFieldKey = ManualJobFieldKey | ManualDocumentFieldKey;

export type ManualFieldInputType = "text" | "date" | "textarea";

export type ManualFieldDefinition = {
  key: ManualFieldKey;
  label: string;
  placeholder?: string;
  required?: boolean;
  storage: "job" | "document";
  jobField?: ManualJobFieldKey;
  inputType?: ManualFieldInputType;
  rows?: number;
};

export const DOCUMENT_MANUAL_FIELD_DEFS: Partial<
  Record<DocumentType, ManualFieldDefinition[]>
> = {
  rate_confirmation: [
    {
      key: "broker_name",
      label: "Broker Name",
      storage: "job",
      jobField: "broker_name",
    },
    {
      key: "load_value",
      label: "Load Value",
      storage: "job",
      jobField: "load_value",
    },
    {
      key: "pickup_location",
      label: "Pickup Location",
      placeholder: "e.g. Dallas, TX",
      storage: "job",
      jobField: "pickup_location",
    },
    {
      key: "delivery_location",
      label: "Delivery Location",
      placeholder: "e.g. Dallas, TX",
      storage: "job",
      jobField: "delivery_location",
    },
    {
      key: "pickup_date",
      label: "Pickup Date",
      storage: "job",
      jobField: "pickup_date",
    },
    {
      key: "delivery_date",
      label: "Delivery Date",
      storage: "job",
      jobField: "delivery_date",
    },
    {
      key: "miles",
      label: "Miles",
      storage: "job",
      jobField: "miles",
    },
  ],
  bol: [
    {
      key: "pickup_location",
      label: "Pickup Location",
      placeholder: "e.g. Dallas, TX",
      required: true,
      storage: "job",
      jobField: "pickup_location",
    },
    {
      key: "delivery_location",
      label: "Delivery Location",
      placeholder: "e.g. Dallas, TX",
      required: true,
      storage: "job",
      jobField: "delivery_location",
    },
    {
      key: "bol_number",
      label: "BOL Number",
      placeholder: "BOL-XXXXXX",
      storage: "document",
    },
    {
      key: "shipper_name",
      label: "Shipper Name",
      placeholder: "Company shipping the freight",
      storage: "document",
    },
    {
      key: "consignee_name",
      label: "Consignee Name",
      placeholder: "Company receiving the freight",
      storage: "document",
    },
  ],
  pod: [
    {
      key: "delivery_date",
      label: "Delivery Date",
      storage: "job",
      jobField: "delivery_date",
      inputType: "date",
    },
    {
      key: "consignee_name",
      label: "Consignee Name",
      placeholder: "Name of person who received the freight",
      storage: "document",
    },
    {
      key: "delivery_address",
      label: "Delivery Address",
      placeholder: "Actual delivery location",
      storage: "document",
    },
    {
      key: "condition_notes",
      label: "Condition Notes",
      placeholder:
        "e.g. Clean delivery / Minor damage noted / Short shipment",
      storage: "document",
      inputType: "textarea",
      rows: 3,
    },
    {
      key: "bol_reference_number",
      label: "BOL Reference Number",
      placeholder: "BOL number this POD refers to",
      storage: "document",
    },
  ],
};

export function getManualFieldDefinitions(
  documentType: string
): ManualFieldDefinition[] {
  return DOCUMENT_MANUAL_FIELD_DEFS[documentType as DocumentType] ?? [];
}

/** @deprecated Use getManualFieldDefinitions */
export function getManualFieldsForDocument(
  documentType: string
): ManualJobFieldKey[] {
  return getManualFieldDefinitions(documentType)
    .filter((def) => def.storage === "job" && def.jobField)
    .map((def) => def.jobField!);
}

export function isNumericJobField(fieldKey: ManualJobFieldKey): boolean {
  return fieldKey === "load_value" || fieldKey === "miles";
}

function readStoredManualFields(
  document?: JobDocument
): Record<string, unknown> {
  if (!document) return {};
  if (document.manual_fields && typeof document.manual_fields === "object") {
    return document.manual_fields;
  }
  if (document.parsed_data && typeof document.parsed_data === "object") {
    return document.parsed_data;
  }
  return {};
}

function readDocumentFieldValue(
  document: JobDocument | undefined,
  key: string
): string {
  const stored = readStoredManualFields(document);
  const raw = stored[key];
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "value" in raw) {
    const value = (raw as { value?: unknown }).value;
    return value === null || value === undefined ? "" : String(value);
  }
  return "";
}

export function loadManualFieldValues(
  definitions: ManualFieldDefinition[],
  job: Job,
  document?: JobDocument
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const def of definitions) {
    if (def.storage === "job" && def.jobField) {
      const raw = job[def.jobField];
      values[def.key] =
        raw === null || raw === undefined ? "" : String(raw);
      if (def.jobField.endsWith("_date") && values[def.key]) {
        values[def.key] = values[def.key].slice(0, 10);
      }
      continue;
    }

    values[def.key] = readDocumentFieldValue(document, def.key);
  }

  return values;
}

export function validateManualFieldValues(
  definitions: ManualFieldDefinition[],
  values: Record<string, string>
): string | null {
  for (const def of definitions) {
    if (!def.required) continue;
    if (!values[def.key]?.trim()) {
      return `${def.label} is required.`;
    }
  }
  return null;
}

export function buildManualFieldUpdates(
  definitions: ManualFieldDefinition[],
  values: Record<string, string>
): {
  jobUpdates: Partial<Job>;
  documentData: Record<string, string>;
} {
  const jobUpdates: Partial<Job> = {};
  const documentData: Record<string, string> = {};

  for (const def of definitions) {
    const raw = values[def.key]?.trim() ?? "";

    if (def.storage === "job" && def.jobField) {
      if (!raw) continue;
      if (isNumericJobField(def.jobField)) {
        const num = Number(raw.replace(/[^0-9.]/g, ""));
        if (!Number.isNaN(num)) {
          (jobUpdates as Record<string, unknown>)[def.jobField] = num;
        }
      } else {
        (jobUpdates as Record<string, unknown>)[def.jobField] = raw;
      }
      continue;
    }

    if (def.storage === "document" && raw) {
      documentData[def.key] = raw;
    }
  }

  return { jobUpdates, documentData };
}

export function isPdfDocument(
  fileUrl: string,
  fileName?: string | null
): boolean {
  const name = (fileName ?? fileUrl).toLowerCase();
  return name.endsWith(".pdf") || fileUrl.toLowerCase().includes(".pdf");
}
