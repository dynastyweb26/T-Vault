import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveAnthropicModel } from "../_shared/anthropic-model.ts";
import { corsHeaders, extractJson, jsonResponse } from "../_shared/cors.ts";
import { checkAiRateLimit, recordAiUsage } from "../_shared/rate-limit.ts";

const STORAGE_BUCKET = "game1-documents";
// Keep in sync with lib/features.ts VOICE_NOTES_ENABLED
const VOICE_NOTES_ENABLED = false;
const VOICE_PROMPT = `Transcribe this audio and categorize it.
Return JSON: { "transcript": "", "category": "expense|general", "suggested_action": "log_expense|note_only", "extracted_amount": null or number, "extracted_category": null or "fuel|lumper|tolls|scales|parking|other", "extracted_description": "" }
If expense: extract the dollar amount and what it's for.
Be conservative — only categorize as expense if amount is clearly mentioned.`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function transcribeAudio(
  apiKey: string,
  model: string,
  base64Data: string,
  mediaType: string
): Promise<Record<string, unknown>> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: VOICE_PROMPT,
            },
            {
              type: "document",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("claude_voice_error:", response.status, errText.slice(0, 500));
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

function normalizeResult(raw: Record<string, unknown>) {
  const category =
    raw.category === "expense" ? "expense" : "general";
  const suggested =
    raw.suggested_action === "log_expense" ? "log_expense" : "note_only";
  const amount =
    typeof raw.extracted_amount === "number"
      ? raw.extracted_amount
      : raw.extracted_amount
        ? Number(raw.extracted_amount)
        : null;

  const validCategories = [
    "fuel",
    "lumper",
    "tolls",
    "scales",
    "parking",
    "other",
  ];
  const extractedCategory =
    typeof raw.extracted_category === "string" &&
    validCategories.includes(raw.extracted_category)
      ? raw.extracted_category
      : null;

  return {
    transcript: String(raw.transcript ?? ""),
    category,
    suggested_action: category === "expense" ? "log_expense" : suggested,
    extracted_amount: Number.isFinite(amount) ? amount : null,
    extracted_category: extractedCategory,
    extracted_description: String(raw.extracted_description ?? raw.transcript ?? ""),
  };
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (!VOICE_NOTES_ENABLED) {
    return jsonResponse(req, { error: "not_found" }, 404);
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

    if (!anthropicKey || !serviceRoleKey) {
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

    const { voiceNoteId, storagePath } = await req.json();
    if (!voiceNoteId || !storagePath) {
      return jsonResponse(req, { error: "missing_params" }, 400);
    }

    if (!storagePath.startsWith(`${user.id}/voice/`)) {
      return jsonResponse(req, { error: "invalid_path" }, 400);
    }

    const { allowed } = await checkAiRateLimit(admin, user.id);
    if (!allowed) {
      return jsonResponse(req, { rateLimited: true }, 429);
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.error("voice_download_failed:", downloadError?.message);
      return jsonResponse(req, { error: "file_fetch_failed" }, 502);
    }

    const buffer = await fileBlob.arrayBuffer();
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return jsonResponse(req, { error: "file_too_large" }, 400);
    }

    const base64 = arrayBufferToBase64(buffer);
    const mediaType = storagePath.endsWith(".webm")
      ? "audio/webm"
      : "audio/mp4";

    const rawParsed = await transcribeAudio(
      anthropicKey,
      model,
      base64,
      mediaType
    );
    const parsed = normalizeResult(rawParsed);

    const { error: saveError } = await supabase
      .from("voice_notes")
      .update({
        transcript: parsed.transcript,
        category: parsed.category,
        suggested_action: parsed.suggested_action,
        extracted_amount: parsed.extracted_amount,
        extracted_category: parsed.extracted_category,
        extracted_description: parsed.extracted_description,
        audio_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", voiceNoteId)
      .eq("user_id", user.id);

    if (saveError) {
      console.error("voice_note_save_failed:", saveError.message);
      return jsonResponse(req, { error: "save_failed" }, 500);
    }

    await recordAiUsage(admin, user.id, voiceNoteId);

    return jsonResponse(req, { ...parsed, saved: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("process-voice-note error:", message);
    return jsonResponse(req, { error: "process_failed" }, 500);
  }
});
