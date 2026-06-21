import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  applySecurityHeaders,
  createRequestNonce,
  forwardNonceHeader,
} from "@/lib/security-headers";

export async function middleware(request: NextRequest) {
  const nonce = createRequestNonce();
  const requestHeaders = forwardNonceHeader(request, nonce);
  const requestWithNonce = new NextRequest(request, { headers: requestHeaders });
  const response = await updateSession(requestWithNonce);
  return applySecurityHeaders(request, response, nonce);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
