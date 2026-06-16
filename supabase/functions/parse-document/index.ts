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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    throw new Error(`claude_error:${response.status}:${errText.slice(0, 200)}`);
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return jsonResponse({ error: "ai_not_configured" }, 503);
    }

    let model: string;
    try {
      model = resolveAnthropicModel();
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid_model";
      return jsonResponse({ error: message }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return jsonResponse({ error: "missing_document_id" }, 400);
    }

    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
    const { count, error: countError } = await supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", windowStart);

    if (countError) {
      return jsonResponse({ error: "rate_check_failed" }, 500);
    }

    if ((count ?? 0) >= RATE_LIMIT) {
      return jsonResponse({ rateLimited: true }, 429);
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return jsonResponse({ error: "document_not_found" }, 404);
    }

    const docType = document.document_type as string;
    if (!isParseableDocType(docType)) {
      return jsonResponse({ error: "unsupported_document_type" }, 400);
    }

    if (
      typeof document.file_url !== "string" ||
      !document.file_url ||
      document.file_url.startsWith("manual://")
    ) {
      return jsonResponse({ error: "missing_file" }, 400);
    }

    const fileResponse = await fetch(document.file_url);
    if (!fileResponse.ok) {
      return jsonResponse({ error: "file_fetch_failed" }, 502);
    }

    const buffer = await fileResponse.arrayBuffer();
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
      .eq("id", documentId);

    if (saveError) {
      return jsonResponse({ error: saveError.message }, 500);
    }

    await supabase.from("ai_usage").insert({
      user_id: user.id,
      document_id: documentId,
    });

    return jsonResponse({ parsed, documentType: docType, saved: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return jsonResponse({ error: message }, 500);
  }
});
