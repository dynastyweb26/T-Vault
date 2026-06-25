export function buildContentSecurityPolicy(
  nonce: string,
  supabaseHost: string,
  pathname?: string
): string {
  const isContactPage = pathname === "/contact";
  const imgSrc = supabaseHost
    ? `img-src 'self' data: blob: https://${supabaseHost}`
    : "img-src 'self' data: blob:";
  const connectSrc = supabaseHost
    ? isContactPage
      ? `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.emailjs.com`
      : `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`
    : isContactPage
      ? "connect-src 'self' https://api.emailjs.com"
      : "connect-src 'self'";
  const frameSrc = supabaseHost
    ? `frame-src 'self' blob: https://${supabaseHost}`
    : "frame-src 'self' blob:";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'" +
      (isContactPage ? " https://fonts.googleapis.com" : ""),
    imgSrc,
    connectSrc,
    frameSrc,
    isContactPage ? "font-src 'self' https://fonts.gstatic.com" : "font-src 'self'",
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
