import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GENERIC_RECEIPT_UPLOAD_ERROR,
  processExpenseReceiptUpload,
} from "@/lib/expenses/server-receipt-upload";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: GENERIC_RECEIPT_UPLOAD_ERROR },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const expenseId = String(formData.get("expenseId") ?? "").trim();

    if (!(file instanceof File) || !expenseId) {
      return NextResponse.json(
        { error: GENERIC_RECEIPT_UPLOAD_ERROR },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await processExpenseReceiptUpload({
      supabase,
      userId: user.id,
      expenseId,
      buffer,
      originalFilename: file.name,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("expense receipt upload failed:", err);
    return NextResponse.json(
      { error: GENERIC_RECEIPT_UPLOAD_ERROR },
      { status: 400 }
    );
  }
}
