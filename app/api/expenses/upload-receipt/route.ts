import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GENERIC_RECEIPT_UPLOAD_ERROR,
  processExpenseReceiptUpload,
} from "@/lib/expenses/server-receipt-upload";

// TEMP DEBUG (remove after diagnosing expense receipt upload failures)
function debugReceiptUploadRoute(label: string, payload: unknown) {
  console.error(`[TEMP DEBUG expense-receipt] ${label}`, payload);
}

export async function POST(request: Request) {
  try {
    debugReceiptUploadRoute("route:start", { method: request.method });

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      debugReceiptUploadRoute("route:auth:failed", {
        authError,
        hasUser: Boolean(user),
      });
      return NextResponse.json(
        { error: GENERIC_RECEIPT_UPLOAD_ERROR },
        { status: 401 }
      );
    }

    debugReceiptUploadRoute("route:auth:ok", { userId: user.id });

    const formData = await request.formData();
    const file = formData.get("file");
    const expenseId = String(formData.get("expenseId") ?? "").trim();

    debugReceiptUploadRoute("route:form-data", {
      expenseId,
      hasFile: file instanceof File,
      fileName: file instanceof File ? file.name : null,
      fileType: file instanceof File ? file.type : null,
      fileSize: file instanceof File ? file.size : null,
    });

    if (!(file instanceof File) || !expenseId) {
      debugReceiptUploadRoute("route:validation:failed", {
        reason: !(file instanceof File) ? "missing_or_invalid_file" : "missing_expense_id",
        expenseId,
      });
      return NextResponse.json(
        { error: GENERIC_RECEIPT_UPLOAD_ERROR },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    debugReceiptUploadRoute("route:process:before", {
      expenseId,
      userId: user.id,
      originalFilename: file.name,
      clientMimeType: file.type,
      bufferSize: buffer.length,
    });

    const result = await processExpenseReceiptUpload({
      supabase,
      userId: user.id,
      expenseId,
      buffer,
      originalFilename: file.name,
    });

    debugReceiptUploadRoute("route:success", {
      expenseId,
      path: result.path,
      url: result.url,
    });
    return NextResponse.json(result);
  } catch (err) {
    debugReceiptUploadRoute("route:exception", {
      err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    console.error("expense receipt upload failed:", err);
    return NextResponse.json(
      { error: GENERIC_RECEIPT_UPLOAD_ERROR },
      { status: 400 }
    );
  }
}
