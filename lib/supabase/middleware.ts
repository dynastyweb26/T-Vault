import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getSessionRedirect,
  isProtectedRoute,
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

  let profile = null;
  if (user && isProtectedRoute(pathname)) {
    const { data, error } = await supabase
      .from("users")
      .select(
        "onboarding_completed, profile_setup_completed, profile_setup_skipped"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[middleware] profile lookup failed:", {
        pathname,
        userId: user.id,
        message: error.message,
      });
    }

    profile = data;
  }

  const decision = getSessionRedirect(pathname, Boolean(user), profile);
  logRedirectDecision(pathname, Boolean(user), profile, decision);

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
