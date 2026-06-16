export function resolveCorsOrigin(req: Request): string {
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

export function corsHeaders(req: Request): Record<string, string> {
  const origin = resolveCorsOrigin(req);
  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function extractJson(text: string): Record<string, unknown> | null {
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
