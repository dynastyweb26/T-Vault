import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractStoragePath,
  isStoragePathOwnedByUser,
  STORAGE_BUCKET,
} from "@/lib/security";

const SIGNED_URL_TTL_SECONDS = 86400;

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

    const body = await request.json();
    const documentId = String(body.documentId ?? "").trim();

    if (!documentId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("file_url")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (docError || !document?.file_url || document.file_url.startsWith("manual://")) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const storagePath = extractStoragePath(document.file_url);

    if (!storagePath || !isStoragePathOwnedByUser(storagePath, user.id)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      console.error("signed-url failed:", signError?.message);
      return NextResponse.json({ error: "sign_failed" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    console.error("signed-url error:", err);
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }
}
