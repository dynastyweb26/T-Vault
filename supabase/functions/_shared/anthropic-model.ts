/** Only Haiku is permitted for document parsing — never Sonnet or Opus. */
export const ANTHROPIC_HAIKU_MODEL = "claude-haiku-4-5-20251001";

const FORBIDDEN_MODEL_MARKERS = ["sonnet", "opus"] as const;

export function resolveAnthropicModel(): string {
  const configured = Deno.env.get("ANTHROPIC_MODEL")?.trim();
  const model = configured || ANTHROPIC_HAIKU_MODEL;
  const lower = model.toLowerCase();

  for (const marker of FORBIDDEN_MODEL_MARKERS) {
    if (lower.includes(marker)) {
      throw new Error("invalid_model:sonnet_and_opus_are_not_permitted");
    }
  }

  if (model !== ANTHROPIC_HAIKU_MODEL) {
    throw new Error(`invalid_model:only_${ANTHROPIC_HAIKU_MODEL}_is_permitted`);
  }

  return model;
}
