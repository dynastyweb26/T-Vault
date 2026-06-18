const FIELD_LABELS: Record<string, string> = {
  job_name: "Job Name",
  load_value: "Load Value",
  broker_name: "Broker Name",
  pickup_location: "Pickup Location",
  pickup_facility: "Pickup Facility",
  delivery_location: "Delivery Location",
  delivery_facility: "Delivery Facility",
  rate_con_number: "Rate Con #",
  bol_number: "BOL #",
  pickup_date: "Pickup Date",
  delivery_date: "Delivery Date",
  invoice_sent_date: "Invoice Sent Date",
  payment_expected_date: "Payment Expected Date",
  payment_received_date: "Payment Received Date",
  payment_type: "Payment Type",
  factoring_company: "Factoring Company",
  miles: "Miles",
  notes: "Notes",
  shipper_name: "Shipper Name",
  consignee_name: "Consignee Name",
  delivery_address: "Delivery Address",
  condition_notes: "Condition Notes",
  bol_reference_number: "BOL Reference Number",
};

export function fieldKeyToLabel(fieldKey: string): string {
  if (FIELD_LABELS[fieldKey]) return FIELD_LABELS[fieldKey];
  return fieldKey
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isDateFieldKey(fieldKey: string): boolean {
  return fieldKey.endsWith("_date");
}

export function isLocationFieldKey(fieldKey: string): boolean {
  return fieldKey === "pickup_location" || fieldKey === "delivery_location";
}

export function isMilesFieldKey(fieldKey: string): boolean {
  return fieldKey === "miles";
}

export const LOCATION_FIELD_PLACEHOLDER = "e.g. Dallas, TX";

export function toDateInputValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function toEditFieldValue(fieldKey: string, value: unknown): string {
  if (isDateFieldKey(fieldKey)) return toDateInputValue(value);
  if (value === null || value === undefined) return "";
  return String(value);
}
