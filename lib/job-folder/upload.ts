import type { SupabaseClient } from "@supabase/supabase-js";
import { checkImageQuality } from "@/lib/job-folder/image-quality";
import { triggerHaptic } from "@/lib/haptics";
import type { DocumentType } from "@/types/job-folder";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/job-folder/file-validation";

const GENERIC_UPLOAD_ERROR = "upload_failed";

export function validateFileType(file: File): boolean {
  if (file.size > MAX_UPLOAD_BYTES) return false;
  return (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type);
}

async function postDocumentUpload(formData: FormData): Promise<{
  url: string;
  path: string;
  documentId: string;
  fileName: string;
}> {
  const response = await fetch("/api/documents/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(GENERIC_UPLOAD_ERROR);
  }

  return response.json();
}

export async function uploadJobDocument(
  _supabase: SupabaseClient,
  params: {
    userId: string;
    jobId: string;
    documentType: DocumentType;
    file: File;
    skipQualityCheck?: boolean;
  }
): Promise<{ url: string; path: string; documentId: string }> {
  const { jobId, documentType, file, skipQualityCheck } = params;

  if (!validateFileType(file)) throw new Error("unsupported_type");

  if (file.type !== "application/pdf" && !skipQualityCheck) {
    const quality = await checkImageQuality(file);
    if (!quality.acceptable) throw new Error("poor_quality");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("jobId", jobId);
  formData.append("documentType", documentType);

  const result = await postDocumentUpload(formData);
  triggerHaptic("medium");
  return result;
}

export async function saveInvoiceDocument(
  _supabase: SupabaseClient,
  params: {
    userId: string;
    jobId: string;
    invoiceNumber: string;
    blob: Blob;
  }
): Promise<string> {
  const { jobId, invoiceNumber, blob } = params;

  const formData = new FormData();
  formData.append("file", blob, "invoice.pdf");
  formData.append("jobId", jobId);
  formData.append("documentType", "invoice");
  formData.append("displayFileName", `${invoiceNumber}.pdf`);
  formData.append("aiConfidence", "high");

  const result = await postDocumentUpload(formData);
  return result.url;
}

export async function saveDocumentFromBlob(
  _supabase: SupabaseClient,
  params: {
    userId: string;
    jobId: string;
    documentType: DocumentType;
    blob: Blob;
    fileName: string;
  }
): Promise<string> {
  const { jobId, documentType, blob } = params;

  const formData = new FormData();
  formData.append("file", blob, "document.pdf");
  formData.append("jobId", jobId);
  formData.append("documentType", documentType);
  formData.append("aiConfidence", "high");

  const result = await postDocumentUpload(formData);
  return result.url;
}
