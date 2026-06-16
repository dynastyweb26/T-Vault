import type { JobDocument } from "@/types/jobs";
import type {
  BolParsedData,
  CrossValidationConflict,
  RateConParsedData,
} from "@/lib/job-folder/ai-types";
import { getDocument } from "@/lib/job-folder/documents";

function normalizeLocation(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9,\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function locationsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeLocation(a);
  const nb = normalizeLocation(b);
  if (!na || !nb) return true;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function bolLocation(
  bol: BolParsedData,
  field: "pickup_location" | "delivery_location"
): string | null {
  const current = bol[field]?.value;
  if (current) return current;

  const legacy =
    field === "pickup_location"
      ? (bol as BolParsedData & { pickup?: { value?: string | null } }).pickup
          ?.value
      : (bol as BolParsedData & { delivery?: { value?: string | null } })
          .delivery?.value;

  return legacy ?? null;
}

export function detectCrossValidationConflicts(
  documents: JobDocument[]
): CrossValidationConflict[] {
  const rateConDoc = getDocument(documents, "rate_confirmation");
  const bolDoc = getDocument(documents, "bol");

  if (!rateConDoc?.parsed_data || !bolDoc?.parsed_data) return [];

  const rateCon = rateConDoc.parsed_data as RateConParsedData;
  const bol = bolDoc.parsed_data as BolParsedData;

  const conflicts: CrossValidationConflict[] = [];
  const bolPickup = bolLocation(bol, "pickup_location");
  const bolDelivery = bolLocation(bol, "delivery_location");

  if (
    rateCon.pickup_location?.value &&
    bolPickup &&
    !locationsMatch(rateCon.pickup_location.value, bolPickup)
  ) {
    conflicts.push({
      field: "pickup_location",
      rateConValue: rateCon.pickup_location.value,
      bolValue: bolPickup,
    });
  }

  if (
    rateCon.delivery_location?.value &&
    bolDelivery &&
    !locationsMatch(rateCon.delivery_location.value, bolDelivery)
  ) {
    conflicts.push({
      field: "delivery_location",
      rateConValue: rateCon.delivery_location.value,
      bolValue: bolDelivery,
    });
  }

  return conflicts;
}

export function resolveCrossValidationConflict(
  conflict: CrossValidationConflict,
  source: "rate_con" | "bol"
): Partial<import("@/types/jobs").Job> {
  const value =
    source === "rate_con" ? conflict.rateConValue : conflict.bolValue;
  if (conflict.field === "pickup_location") {
    return { pickup_location: value };
  }
  return { delivery_location: value };
}
