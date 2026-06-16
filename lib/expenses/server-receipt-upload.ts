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

async function assertTruckExpenseOwnership(
  supabase: SupabaseClient,
  expenseId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("user_id", userId)
    .is("job_id", null)
    .maybeSingle();

  return !error && Boolean(data?.id);
}

function buildExpenseReceiptPath(
  userId: string,
  expenseId: string,
  extension: "jpg" | "png" | "pdf"
): string {
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

  const ownsExpense = await assertTruckExpenseOwnership(
    supabase,
    expenseId,
    userId
  );
  if (!ownsExpense) {
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
  const path = buildExpenseReceiptPath(userId, expenseId, extension);

  const url = await uploadBufferToStorage(
    supabase,
    path,
    uploadBuffer,
    contentType
  );

  const { error: updateError } = await supabase
    .from("expenses")
    .update({ receipt_url: url })
    .eq("id", expenseId)
    .eq("user_id", userId)
    .is("job_id", null);

  if (updateError) throw new Error("upload_failed");

  return { url, path };
}
