import type { SupabaseClient } from "@supabase/supabase-js";
import {
  detectFileTypeFromBuffer,
  extensionForUploadType,
  isSuspiciousFilename,
  MAX_UPLOAD_BYTES,
  validateUploadBuffer,
} from "@/lib/job-folder/file-validation";
import { compressImageBuffer } from "@/lib/job-folder/server-image-compress";
import {
  STORAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/job-folder/constants";
import { TRUCK_EXPENSE_FOLDER } from "@/lib/expenses/constants";

// TEMP DEBUG (remove after diagnosing expense receipt upload failures)
function debugReceiptUpload(label: string, payload: unknown) {
  console.error(`[TEMP DEBUG expense-receipt] ${label}`, payload);
}

function describeUploadValidationFailure(
  buffer: Buffer,
  originalFilename?: string | null
) {
  if (buffer.length === 0) {
    return { reason: "empty_buffer" as const, size: buffer.length };
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      reason: "file_too_large" as const,
      size: buffer.length,
      maxBytes: MAX_UPLOAD_BYTES,
    };
  }

  if (originalFilename && isSuspiciousFilename(originalFilename)) {
    return {
      reason: "suspicious_filename" as const,
      originalFilename,
    };
  }

  const detectedType = detectFileTypeFromBuffer(buffer);
  if (!detectedType) {
    return {
      reason: "invalid_magic_bytes" as const,
      size: buffer.length,
      magicHexPrefix: buffer.subarray(0, Math.min(buffer.length, 16)).toString("hex"),
    };
  }

  return null;
}

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

  debugReceiptUpload("process:start", {
    userId,
    expenseId,
    originalFilename,
    bufferSize: buffer.length,
    detectedType: detectFileTypeFromBuffer(buffer),
  });

  const validation = validateUploadBuffer(buffer, originalFilename);
  if (!validation.ok) {
    debugReceiptUpload("process:validation:failed", {
      ...describeUploadValidationFailure(buffer, originalFilename),
    });
    throw new Error(GENERIC_RECEIPT_UPLOAD_ERROR);
  }

  debugReceiptUpload("process:validation:ok", {
    contentType: validation.contentType,
    originalFilename,
    bufferSize: buffer.length,
  });

  const expense = await assertExpenseOwnership(supabase, expenseId, userId);
  if (!expense) {
    debugReceiptUpload("process:expense-ownership:failed", {
      expenseId,
      userId,
    });
    throw new Error(GENERIC_RECEIPT_UPLOAD_ERROR);
  }

  debugReceiptUpload("process:expense-ownership:ok", {
    expenseId: expense.id,
    jobId: expense.job_id,
  });

  let uploadBuffer = buffer;
  let contentType = validation.contentType;
  let compressedImage = false;

  if (
    validation.contentType === "image/jpeg" ||
    validation.contentType === "image/png"
  ) {
    debugReceiptUpload("process:compress:before", {
      sourceType: validation.contentType,
      inputSize: buffer.length,
    });
    try {
      uploadBuffer = await compressImageBuffer(buffer, validation.contentType);
      debugReceiptUpload("process:compress:ok", {
        sourceType: validation.contentType,
        outputSize: uploadBuffer.length,
        outputType: contentType,
      });
    } catch (err) {
      debugReceiptUpload("process:compress:failed", {
        sourceType: validation.contentType,
        inputSize: buffer.length,
        err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
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

  debugReceiptUpload("process:storage-upload:before", {
    path,
    contentType,
    bufferSize: uploadBuffer.length,
    extension,
  });

  let url: string;
  try {
    url = await uploadBufferToStorage(
      supabase,
      path,
      uploadBuffer,
      contentType
    );
    debugReceiptUpload("process:storage-upload:ok", { path, url });
  } catch (err) {
    debugReceiptUpload("process:storage-upload:failed", {
      path,
      contentType,
      bufferSize: uploadBuffer.length,
      err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }

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

  debugReceiptUpload("process:expense-update:before", {
    expenseId,
    userId,
    jobId: expense.job_id,
    url,
  });

  const { error: updateError } = await updateQuery;

  if (updateError) {
    debugReceiptUpload("process:expense-update:failed", {
      expenseId,
      userId,
      jobId: expense.job_id,
      updateError,
      updateErrorDetails: {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      },
    });
    throw new Error("upload_failed");
  }

  debugReceiptUpload("process:success", { expenseId, url, path });
  return { url, path };
}
