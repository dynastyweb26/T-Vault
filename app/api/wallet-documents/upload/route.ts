import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GENERIC_UPLOAD_ERROR } from "@/lib/job-folder/server-upload";
import { buildWalletStoragePath } from "@/lib/document-wallet/queries";
import {
  extensionForUploadType,
  validateUploadBuffer,
} from "@/lib/job-folder/file-validation";

const STORAGE_BUCKET = "game1-documents";
const SIGNED_URL_TTL = 60 * 60 * 24;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = String(formData.get("documentType") ?? "").trim();
    const documentId = String(formData.get("documentId") ?? "").trim();
    const expiryDate = formData.get("expiryDate");

    if (!(file instanceof File) || !documentType) {
      return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uint8 = new Uint8Array(buffer);

    const validation = validateUploadBuffer(uint8, file.name);
    if (!validation.ok) {
      return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 400 });
    }

    const extension = extensionForUploadType(validation.contentType);
    const storagePath = buildWalletStoragePath(user.id, documentType, extension);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: validation.contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("wallet upload failed:", uploadError.message);
      return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 500 });
    }

    const { data: signed } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    const updates = {
      file_path: storagePath,
      file_url: signed?.signedUrl ?? null,
      updated_at: new Date().toISOString(),
      ...(typeof expiryDate === "string" && expiryDate
        ? { expiry_date: expiryDate }
        : {}),
    };

    if (documentId) {
      const { data, error } = await supabase
        .from("user_documents")
        .update(updates)
        .eq("id", documentId)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 500 });
      }
      return NextResponse.json({ document: data });
    }

    const { data, error } = await supabase
      .from("user_documents")
      .upsert(
        {
          user_id: user.id,
          document_type: documentType,
          ...updates,
        },
        { onConflict: "user_id,document_type,custom_name" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error("wallet document upload failed:", err);
    return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 400 });
  }
}
