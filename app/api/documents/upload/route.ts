import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GENERIC_UPLOAD_ERROR,
  processDocumentUpload,
} from "@/lib/job-folder/server-upload";

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
    const jobId = String(formData.get("jobId") ?? "").trim();
    const documentType = String(formData.get("documentType") ?? "").trim();
    const displayFileName = formData.get("displayFileName");
    const aiConfidence = String(formData.get("aiConfidence") ?? "unread").trim();
    const storagePath = formData.get("storagePath");

    if (!(file instanceof File) || !jobId || !documentType) {
      return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await processDocumentUpload({
      supabase,
      userId: user.id,
      jobId,
      documentType,
      buffer,
      originalFilename: file.name,
      displayFileName:
        typeof displayFileName === "string" ? displayFileName : null,
      aiConfidence: aiConfidence || "unread",
      storagePath: typeof storagePath === "string" ? storagePath : null,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("document upload failed:", err);
    return NextResponse.json({ error: GENERIC_UPLOAD_ERROR }, { status: 400 });
  }
}
