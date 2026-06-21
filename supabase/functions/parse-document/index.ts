import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveAnthropicModel } from "../_shared/anthropic-model.ts";
import {
  aggregateDocumentConfidence,
  isParseableDocType,
  normalizeExtractedDocument,
  promptForDocumentType,
} from "../_shared/document-parsing.ts";

const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;
const STORAGE_BUCKET = "game1-documents";

function resolveCorsOrigin(req: Request): string {
  const configured = Deno.env.get("ALLOWED_ORIGIN");
  const origin = req.headers.get("Origin");
  if (configured) return configured;
  if (
    origin &&
    (origin.includes("localhost") || origin.includes("127.0.0.1"))
  ) {
    return origin;
  }
  return "";
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = resolveCorsOrigin(req);
  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const patterns = [
      /\/storage\/v1\/object\/sign\/[^/]+\/(.+)/,
      /\/storage\/v1\/object\/public\/[^/]+\/(.+)/,
      /\/storage\/v1\/object\/authenticated\/[^/]+\/(.+)/,
    ];

    for (const pattern of patterns) {
      const match = url.pathname.match(pattern);
      if (match?.[1]) {
        return decodeURIComponent(match[1].split("?")[0]);
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string,
  mediaType: string,
  base64Data: string
): Promise<Record<string, unknown>> {
  const isPdf = mediaType === "application/pdf";
  const contentBlock = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: mediaType, data: base64Data },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64Data },
      };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("claude_error:", response.status, errText.slice(0, 500));
    throw new Error("claude_error");
  }

  const result = await response.json();
  const textBlock = result.content?.find(
    (block: { type: string }) => block.type === "text"
  );
  const text = textBlock?.text ?? "";
  const parsed = extractJson(text);
  if (!parsed) throw new Error("invalid_json");
  return parsed;
}

function resolveMediaType(fileName: string, fileUrl: string): string {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf") || fileUrl.toLowerCase().includes(".pdf")) {
    return "application/pdf";
  }
  if (name.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { error: "unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return jsonResponse(req, { error: "ai_not_configured" }, 503);
    }

    if (!serviceRoleKey) {
      return jsonResponse(req, { error: "server_misconfigured" }, 503);
    }

    let model: string;
    try {
      model = resolveAnthropicModel();
    } catch {
      return jsonResponse(req, { error: "invalid_model" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(req, { error: "unauthorized" }, 401);
    }

    const body = await req.json();
    const preview = Boolean(body.preview);

    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
    const { count, error: countError } = await admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", windowStart);

    if (countError) {
      console.error("rate_check_failed:", countError.message);
      return jsonResponse(req, { error: "rate_check_failed" }, 500);
    }

    if ((count ?? 0) >= RATE_LIMIT) {
      return jsonResponse(req, { rateLimited: true }, 429);
    }

    if (preview) {
      const docType = String(body.documentType ?? "");
      const mediaType = String(body.mediaType ?? "");
      const base64 = String(body.base64 ?? "");

      if (!isParseableDocType(docType) || docType !== "rate_confirmation") {
        return jsonResponse(req, { error: "unsupported_document_type" }, 400);
      }

      if (
        !base64 ||
        !["image/jpeg", "image/png", "application/pdf"].includes(mediaType)
      ) {
        return jsonResponse(req, { error: "invalid_preview_payload" }, 400);
      }

      const prompt = promptForDocumentType(docType);
      const rawParsed = await callClaude(
        anthropicKey,
        model,
        prompt,
        mediaType,
        base64
      );

      const parsed = normalizeExtractedDocument(docType, rawParsed);

      const { error: usageError } = await admin.from("ai_usage").insert({
        user_id: user.id,
        document_id: null,
      });

      if (usageError) {
        console.error("ai_usage_insert_failed:", usageError.message);
      }

      return jsonResponse(req, {
        parsed,
        documentType: docType,
        saved: false,
        preview: true,
      });
    }

    const documentId = body.documentId;
    if (!documentId) {
      return jsonResponse(req, { error: "missing_document_id" }, 400);
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return jsonResponse(req, { error: "document_not_found" }, 404);
    }

    const docType = document.document_type as string;
    if (!isParseableDocType(docType)) {
      return jsonResponse(req, { error: "unsupported_document_type" }, 400);
    }

    if (
      typeof document.file_url !== "string" ||
      !document.file_url ||
      document.file_url.startsWith("manual://")
    ) {
      return jsonResponse(req, { error: "missing_file" }, 400);
    }

    const storagePath = extractStoragePath(document.file_url);
    if (!storagePath || !storagePath.startsWith(`${user.id}/`)) {
      return jsonResponse(req, { error: "invalid_file_url" }, 400);
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.error("file_download_failed:", downloadError?.message);
      return jsonResponse(req, { error: "file_fetch_failed" }, 502);
    }

    const buffer = await fileBlob.arrayBuffer();
    const fileName = document.file_name ?? "";
    const mediaType = resolveMediaType(fileName, document.file_url);
    const base64 = arrayBufferToBase64(buffer);
    const prompt = promptForDocumentType(docType);

    const rawParsed = await callClaude(
      anthropicKey,
      model,
      prompt,
      mediaType,
      base64
    );

    const parsed = normalizeExtractedDocument(docType, rawParsed);
    const aiConfidence = aggregateDocumentConfidence(Object.values(parsed));

    const { error: saveError } = await supabase
      .from("documents")
      .update({
        parsed_data: parsed,
        parsing_status: "complete",
        ai_confidence: aiConfidence,
        parse_error: null,
      })
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (saveError) {
      console.error("document_save_failed:", saveError.message);
      return jsonResponse(req, { error: "save_failed" }, 500);
    }

    const { error: usageError } = await admin.from("ai_usage").insert({
      user_id: user.id,
      document_id: documentId,
    });

    if (usageError) {
      console.error("ai_usage_insert_failed:", usageError.message);
    }

    return jsonResponse(req, { parsed, documentType: docType, saved: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("parse-document error:", message);
    return jsonResponse(req, { error: "parse_failed" }, 500);
  }
});
