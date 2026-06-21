import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertUserOwnedStoragePath,
  buildServerDisplayName,
  buildServerStoragePath,
  extensionForUploadType,
  validateUploadBuffer,
} from "@/lib/job-folder/file-validation";
import { compressImageBuffer } from "@/lib/job-folder/server-image-compress";
import { STORAGE_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/job-folder/constants";

const GENERIC_UPLOAD_ERROR = "Upload could not be completed. Please try again.";

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

async function assertJobOwnership(
  supabase: SupabaseClient,
  jobId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data?.id);
}

async function upsertDocumentRow(
  supabase: SupabaseClient,
  row: Omit<DocumentRowInsert, "created_at"> & { created_at?: string }
): Promise<string> {
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("job_id", row.job_id)
    .eq("user_id", row.user_id)
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
      .eq("id", existing.id)
      .eq("user_id", row.user_id);
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

async function uploadBufferToStorage(
  supabase: SupabaseClient,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { upsert: true, contentType });

  if (uploadError) throw new Error("upload_failed");

  const { data: signed, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) throw new Error("upload_failed");
  return signed.signedUrl;
}

export type ProcessDocumentUploadParams = {
  supabase: SupabaseClient;
  userId: string;
  jobId: string;
  documentType: string;
  buffer: Buffer;
  originalFilename?: string | null;
  displayFileName?: string | null;
  aiConfidence?: string;
  storagePath?: string | null;
};

export type ProcessDocumentUploadResult = {
  url: string;
  path: string;
  documentId: string;
  fileName: string;
};

export async function processDocumentUpload(
  params: ProcessDocumentUploadParams
): Promise<ProcessDocumentUploadResult> {
  const {
    supabase,
    userId,
    jobId,
    documentType,
    buffer,
    originalFilename,
    displayFileName,
    aiConfidence = "unread",
    storagePath,
  } = params;

  const validation = validateUploadBuffer(buffer, originalFilename);
  if (!validation.ok) {
    throw new Error(GENERIC_UPLOAD_ERROR);
  }

  const ownsJob = await assertJobOwnership(supabase, jobId, userId);
  if (!ownsJob) {
    throw new Error(GENERIC_UPLOAD_ERROR);
  }

  let uploadBuffer = buffer;
  let contentType = validation.contentType;
  let compressedImage = false;

  if (
    validation.contentType === "image/jpeg" ||
    validation.contentType === "image/png"
  ) {
    uploadBuffer = await compressImageBuffer(buffer, validation.contentType);
    contentType = "image/jpeg";
    compressedImage = true;
  }

  const extension = extensionForUploadType(validation.contentType, compressedImage);
  let path = buildServerStoragePath(userId, jobId, documentType, extension);
  if (storagePath?.trim()) {
    try {
      assertUserOwnedStoragePath(storagePath, userId);
    } catch {
      throw new Error(GENERIC_UPLOAD_ERROR);
    }
    path = storagePath.trim();
  }
  const fileName =
    displayFileName?.trim() ||
    buildServerDisplayName(documentType, extension);

  const url = await uploadBufferToStorage(
    supabase,
    path,
    uploadBuffer,
    contentType
  );

  const documentId = await upsertDocumentRow(supabase, {
    job_id: jobId,
    user_id: userId,
    document_type: documentType,
    file_url: url,
    file_name: fileName,
    upload_status: "uploaded",
    ai_confidence: aiConfidence,
  });

  await supabase
    .from("jobs")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("user_id", userId);

  return { url, path, documentId, fileName };
}

export { GENERIC_UPLOAD_ERROR };
