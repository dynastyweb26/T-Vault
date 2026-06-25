const EMAILJS_API = "https://api.emailjs.com";
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";

export function buildContentSecurityPolicy(
  nonce: string,
  supabaseHost: string
): string {
  const imgSrc = supabaseHost
    ? `img-src 'self' data: blob: https://${supabaseHost}`
    : "img-src 'self' data: blob:";
  const connectSrc = supabaseHost
    ? `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} ${EMAILJS_API}`
    : `connect-src 'self' ${EMAILJS_API}`;
  const frameSrc = supabaseHost
    ? `frame-src 'self' blob: https://${supabaseHost}`
    : "frame-src 'self' blob:";

  // EmailJS + Google Fonts must be allowed on every document: CSP is fixed at
  // initial load, and /contact is often reached via client-side navigation from
  // Profile or auth pages (which would keep a stricter policy otherwise).
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_CSS}`,
    imgSrc,
    connectSrc,
    frameSrc,
    `font-src 'self' ${GOOGLE_FONTS_FILES}`,
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
