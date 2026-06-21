import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateUploadBuffer } from "@/lib/job-folder/file-validation";

const GENERIC_ERROR = "Could not read that document. Try again or enter details manually.";

function resolveMediaType(contentType: string): string {
  if (contentType === "application/pdf") return "application/pdf";
  if (contentType === "image/png") return "image/png";
  return "image/jpeg";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateUploadBuffer(buffer, file.name);
    if (!validation.ok) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
    }

    const mediaType = resolveMediaType(validation.contentType);
    const base64 = buffer.toString("base64");

    const { data, error } = await supabase.functions.invoke("parse-document", {
      body: {
        preview: true,
        documentType: "rate_confirmation",
        mediaType,
        base64,
      },
    });

    if (error) {
      const message = error.message ?? "parse_failed";
      if (message.includes("429") || data?.rateLimited) {
        return NextResponse.json({ rateLimited: true }, { status: 429 });
      }
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
    }

    if (data?.rateLimited) {
      return NextResponse.json({ rateLimited: true }, { status: 429 });
    }

    if (data?.error || !data?.parsed) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
    }

    return NextResponse.json({
      parsed: data.parsed,
      documentType: data.documentType ?? "rate_confirmation",
    });
  } catch (err) {
    console.error("parse-rate-con-preview failed:", err);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
