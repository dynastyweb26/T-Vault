import {
  Fuel,
  HardHat,
  ParkingCircle,
  Receipt,
  Scale,
  type LucideIcon,
} from "lucide-react";

export const STORAGE_BUCKET = "game1-documents";

export const SCROLL_STORAGE_KEY = "tvault-loads-scroll";

export const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export const DOC_TYPE_LABELS = {
  rate_confirmation: "Rate Confirmation",
  bol: "Bill of Lading (BOL)",
  pod: "Proof of Delivery (POD)",
  invoice: "Invoice",
  fuel_receipt: "Fuel Receipt",
  lumper_receipt: "Lumper Receipt",
  detention_invoice: "Detention Invoice",
} as const;

export type RequiredDocType = "rate_confirmation" | "bol" | "pod";

export const REQUIRED_DOC_TYPES: RequiredDocType[] = [
  "rate_confirmation",
  "bol",
  "pod",
];

export const JOB_EXPENSE_CATEGORIES = [
  { id: "fuel", label: "Fuel", icon: Fuel },
  { id: "lumper", label: "Lumper Fee", icon: HardHat },
  { id: "tolls", label: "Toll", icon: Receipt },
  { id: "scales", label: "Scale Ticket", icon: Scale },
  { id: "parking", label: "Parking", icon: ParkingCircle },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: LucideIcon;
}>;

export function truncateTitle(title: string, max = 30): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max)}...`;
}

export const DETENTION_RATE_KEY = "tvault_detention_rate";

export function getDetentionRate(profileRate?: number | null): number {
  if (profileRate && profileRate > 0) return profileRate;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(DETENTION_RATE_KEY);
    if (stored) return Number(stored) || 50;
  }
  return 50;
}
