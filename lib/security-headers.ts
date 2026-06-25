import { type NextRequest, NextResponse } from "next/server";
import { buildContentSecurityPolicy, getSupabaseHost } from "@/lib/csp";

const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/** Microphone allowed only on voice-note routes; blocked elsewhere. */
const PERMISSIONS_POLICY_DEFAULT = "camera=(), microphone=(), geolocation=()";
const PERMISSIONS_POLICY_VOICE_NOTE =
  "camera=(), microphone=(self), geolocation=()";

export function createRequestNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function isVoiceNoteRoute(pathname: string): boolean {
  return pathname === "/voice-note" || pathname.startsWith("/voice-note/");
}

export function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse,
  nonce: string
): NextResponse {
  const csp = buildContentSecurityPolicy(nonce, getSupabaseHost(), request.nextUrl.pathname);
  const permissionsPolicy = isVoiceNoteRoute(request.nextUrl.pathname)
    ? PERMISSIONS_POLICY_VOICE_NOTE
    : PERMISSIONS_POLICY_DEFAULT;

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Permissions-Policy", permissionsPolicy);
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  response.headers.set("x-nonce", nonce);
  return response;
}

export function forwardNonceHeader(
  request: NextRequest,
  nonce: string
): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  return requestHeaders;
}
