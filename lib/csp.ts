export function buildContentSecurityPolicy(nonce: string, supabaseHost: string): string {
  const imgSrc = supabaseHost
    ? `img-src 'self' data: blob: https://${supabaseHost}`
    : "img-src 'self' data: blob:";
  const connectSrc = supabaseHost
    ? `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`
    : "connect-src 'self'";
  const frameSrc = supabaseHost
    ? `frame-src 'self' blob: https://${supabaseHost}`
    : "frame-src 'self' blob:";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    imgSrc,
    connectSrc,
    frameSrc,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function getSupabaseHost(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "";
  }
}
