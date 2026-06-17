import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserDocument, WalletDocumentType } from "@/types/database";
import {
  CreditCard,
  FileCheck,
  Heart,
  Layers,
  Shield,
  Truck,
  type LucideIcon,
} from "lucide-react";

export const STORAGE_BUCKET = "game1-documents";

export interface WalletDocDefinition {
  type: WalletDocumentType;
  label: string;
  icon: LucideIcon;
}

export const DEFAULT_WALLET_DOCS: WalletDocDefinition[] = [
  { type: "cdl", label: "CDL (Commercial Driver's License)", icon: CreditCard },
  { type: "medical", label: "Medical Certificate", icon: Heart },
  { type: "truck_registration", label: "Truck Registration", icon: Truck },
  { type: "trailer_registration", label: "Trailer Registration", icon: Layers },
  { type: "cargo_insurance", label: "Cargo Insurance", icon: Shield },
  { type: "liability_insurance", label: "Liability Insurance", icon: FileCheck },
];

export function expiryColorClass(daysUntil: number | null): string {
  if (daysUntil === null) return "text-[var(--color-text-muted)]";
  if (daysUntil < 0) return "text-[var(--color-danger-text)]";
  if (daysUntil < 30) return "text-[var(--color-danger-text)]";
  if (daysUntil <= 60) return "text-[var(--color-warning-text)]";
  return "text-[var(--color-success-text)]";
}

export function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${expiryDate}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isExpired(expiryDate: string | null): boolean {
  const days = daysUntilExpiry(expiryDate);
  return days !== null && days < 0;
}

export async function fetchUserDocuments(
  supabase: SupabaseClient,
  userId: string
): Promise<UserDocument[]> {
  const { data } = await supabase
    .from("user_documents")
    .select("*")
    .eq("user_id", userId)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  return (data as UserDocument[]) ?? [];
}

export async function upsertUserDocument(
  supabase: SupabaseClient,
  userId: string,
  doc: Partial<UserDocument> & { document_type: string }
): Promise<UserDocument | null> {
  const { data, error } = await supabase
    .from("user_documents")
    .upsert(
      {
        ...doc,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,document_type,custom_name" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("user_document upsert failed:", error.message);
    return null;
  }
  return data as UserDocument;
}

export function buildWalletStoragePath(
  userId: string,
  documentType: string,
  extension: string
): string {
  const safe = documentType.replace(/[^a-z0-9_]/gi, "") || "document";
  return `${userId}/wallet/${safe}_${Date.now()}.${extension}`;
}

export async function hasExpiredDocuments(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const docs = await fetchUserDocuments(supabase, userId);
  return docs.some((d) => isExpired(d.expiry_date));
}
