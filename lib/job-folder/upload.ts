import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "@/lib/job-folder/constants";
import { checkImageQuality, compressImage } from "@/lib/job-folder/image-quality";
import { triggerHaptic } from "@/lib/haptics";
import type { DocumentType } from "@/types/job-folder";
import { ACCEPTED_MIME_TYPES } from "@/lib/job-folder/constants";

export function validateFileType(file: File): boolean {
  return ACCEPTED_MIME_TYPES.has(file.type);
}

export function buildStoragePath(
  userId: string,
  jobId: string,
  documentType: string,
  file: File
): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${userId}/${jobId}/${documentType}_${Date.now()}.${ext}`;
}

type DocumentRowInsert = {
  job_id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  upload_status: string;
  ai_confidence: string;
  created_at: string;
};

async function upsertDocumentRow(
  supabase: SupabaseClient,
  row: Omit<DocumentRowInsert, "created_at"> & { created_at?: string }
): Promise<string> {
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("job_id", row.job_id)
    .eq("document_type", row.document_type)
    .maybeSingle();

  const updatePayload = {
    job_id: row.job_id,
    user_id: row.user_id,
    document_type: row.document_type,
    file_url: row.file_url,
    file_name: row.file_name,
    upload_status: row.upload_status,
    ai_confidence: row.ai_confidence,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("documents")
      .update(updatePayload)
      .eq("id", existing.id);
    if (error) throw new Error("upload_failed");
    return existing.id;
  }

  const insertPayload: DocumentRowInsert = {
    ...updatePayload,
    created_at: row.created_at ?? new Date().toISOString(),
  };

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !inserted?.id) throw new Error("upload_failed");
  return inserted.id;
}

export async function uploadToStorage(
  supabase: SupabaseClient,
  path: string,
  blob: Blob,
  contentType: string
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, { upsert: true, contentType });

  if (uploadError) throw new Error("upload_failed");

  const { data: signed, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signError || !signed?.signedUrl) throw new Error("upload_failed");
  return signed.signedUrl;
}

export async function uploadJobDocument(
  supabase: SupabaseClient,
  params: {
    userId: string;
    jobId: string;
    documentType: DocumentType;
    file: File;
    skipQualityCheck?: boolean;
  }
): Promise<{ url: string; path: string; documentId: string }> {
  const { userId, jobId, documentType, file, skipQualityCheck } = params;

  if (!validateFileType(file)) throw new Error("unsupported_type");

  let uploadBlob: Blob = file;
  let uploadName = file.name;
  const isPdf = file.type === "application/pdf";

  if (!isPdf && !skipQualityCheck) {
    const quality = await checkImageQuality(file);
    if (!quality.acceptable) throw new Error("poor_quality");
    uploadBlob = await compressImage(file);
    uploadName = file.name.replace(/\.[^.]+$/, ".jpg");
  }

  const path = buildStoragePath(userId, jobId, documentType, file);
  const url = await uploadToStorage(
    supabase,
    path,
    uploadBlob,
    isPdf ? "application/pdf" : "image/jpeg"
  );

  const documentId = await upsertDocumentRow(supabase, {
    job_id: jobId,
    user_id: userId,
    document_type: documentType,
    file_url: url,
    file_name: uploadName,
    upload_status: "uploaded",
    ai_confidence: "unread",
  });

  await supabase
    .from("jobs")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", jobId);

  triggerHaptic("medium");
  return { url, path, documentId };
}

export async function saveInvoiceDocument(
  supabase: SupabaseClient,
  params: {
    userId: string;
    jobId: string;
    invoiceNumber: string;
    blob: Blob;
  }
): Promise<string> {
  const { userId, jobId, invoiceNumber, blob } = params;
  const path = `${userId}/${jobId}/${invoiceNumber}.pdf`;
  const url = await uploadToStorage(supabase, path, blob, "application/pdf");

  await upsertDocumentRow(supabase, {
    job_id: jobId,
    user_id: userId,
    document_type: "invoice",
    file_url: url,
    file_name: `${invoiceNumber}.pdf`,
    upload_status: "uploaded",
    ai_confidence: "high",
  });

  return url;
}

export async function saveDocumentFromBlob(
  supabase: SupabaseClient,
  params: {
    userId: string;
    jobId: string;
    documentType: DocumentType;
    blob: Blob;
    fileName: string;
  }
): Promise<string> {
  const { userId, jobId, documentType, blob, fileName } = params;
  const path = `${userId}/${jobId}/${documentType}_${Date.now()}.pdf`;
  const url = await uploadToStorage(supabase, path, blob, "application/pdf");

  await upsertDocumentRow(supabase, {
    job_id: jobId,
    user_id: userId,
    document_type: documentType,
    file_url: url,
    file_name: fileName,
    upload_status: "uploaded",
    ai_confidence: "high",
  });

  return url;
}
