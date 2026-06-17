import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extensionForUploadType,
  validateUploadBuffer,
} from "@/lib/job-folder/file-validation";
import { compressImageBuffer } from "@/lib/job-folder/server-image-compress";
import {
  STORAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/job-folder/constants";
import { TRUCK_EXPENSE_FOLDER } from "@/lib/expenses/constants";

export const GENERIC_RECEIPT_UPLOAD_ERROR =
  "Upload could not be completed. Please try again.";

type ExpenseOwnership = {
  id: string;
  job_id: string | null;
};

async function assertExpenseOwnership(
  supabase: SupabaseClient,
  expenseId: string,
  userId: string
): Promise<ExpenseOwnership | null> {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, job_id")
    .eq("id", expenseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data as ExpenseOwnership;
}

function buildExpenseReceiptPath(
  userId: string,
  expenseId: string,
  jobId: string | null,
  extension: "jpg" | "png" | "pdf"
): string {
  if (jobId) {
    return `${userId}/${jobId}/expense_receipt_${expenseId}_${Date.now()}.${extension}`;
  }

  return `${userId}/${TRUCK_EXPENSE_FOLDER}/${expenseId}/receipt_${Date.now()}.${extension}`;
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

export type ProcessExpenseReceiptUploadParams = {
  supabase: SupabaseClient;
  userId: string;
  expenseId: string;
  buffer: Buffer;
  originalFilename?: string | null;
};

export type ProcessExpenseReceiptUploadResult = {
  url: string;
  path: string;
};

export async function processExpenseReceiptUpload(
  params: ProcessExpenseReceiptUploadParams
): Promise<ProcessExpenseReceiptUploadResult> {
  const { supabase, userId, expenseId, buffer, originalFilename } = params;

  const validation = validateUploadBuffer(buffer, originalFilename);
  if (!validation.ok) {
    throw new Error(GENERIC_RECEIPT_UPLOAD_ERROR);
  }

  const expense = await assertExpenseOwnership(supabase, expenseId, userId);
  if (!expense) {
    throw new Error(GENERIC_RECEIPT_UPLOAD_ERROR);
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
  const path = buildExpenseReceiptPath(
    userId,
    expenseId,
    expense.job_id,
    extension
  );

  const url = await uploadBufferToStorage(
    supabase,
    path,
    uploadBuffer,
    contentType
  );

  let updateQuery = supabase
    .from("expenses")
    .update({ receipt_url: url })
    .eq("id", expenseId)
    .eq("user_id", userId);

  if (expense.job_id) {
    updateQuery = updateQuery.eq("job_id", expense.job_id);
  } else {
    updateQuery = updateQuery.is("job_id", null);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) throw new Error("upload_failed");

  return { url, path };
}
