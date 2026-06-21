import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  logRedirectDecision,
  resolveMiddlewareDecision,
  type ProfileFlowState,
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

  let profile: ProfileFlowState | null = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select(
        "onboarding_completed, profile_setup_completed, profile_setup_skipped"
      )
      .eq("id", user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  const decision = resolveMiddlewareDecision(pathname, Boolean(user), profile);
  logRedirectDecision(pathname, Boolean(user), profile, {
    redirectTo: decision.action === "redirect" ? decision.redirectTo : null,
    reason: decision.reason,
  });

  if (decision.action === "json") {
    return NextResponse.json(
      { error: decision.error },
      { status: decision.status }
    );
  }

  if (decision.action === "redirect") {
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
