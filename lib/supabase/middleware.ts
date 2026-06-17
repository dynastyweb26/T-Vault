import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getSessionRedirect,
  logRedirectDecision,
} from "@/lib/middleware-redirect";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const decision = getSessionRedirect(pathname, Boolean(user), null);
  logRedirectDecision(pathname, Boolean(user), null, decision);

  if (decision.redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = decision.redirectTo;
    console.info("[middleware] redirecting", {
      from: pathname,
      to: decision.redirectTo,
      reason: decision.reason,
      userId: user?.id ?? null,
    });
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
