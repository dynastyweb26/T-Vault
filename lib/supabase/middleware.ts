import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  APP_ROUTES,
  AUTH_ROUTES,
  ONBOARDING_REQUIRED_PREFIXES,
  PROTECTED_PREFIXES,
} from "@/lib/constants";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, skip auth logic so the app still renders.
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  const isProtectedRoute = PROTECTED_PREFIXES.some((route) =>
    pathname.startsWith(route)
  );
  const requiresOnboarding = ONBOARDING_REQUIRED_PREFIXES.some((route) =>
    pathname.startsWith(route)
  );

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = APP_ROUTES.splash;
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute && pathname !== APP_ROUTES.splash) {
    const url = request.nextUrl.clone();
    url.pathname = APP_ROUTES.splash;
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_completed, profile_setup_completed, profile_setup_skipped")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile && requiresOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = APP_ROUTES.splash;
      return NextResponse.redirect(url);
    }

    if (profile && !profile.onboarding_completed && requiresOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = APP_ROUTES.onboarding;
      return NextResponse.redirect(url);
    }

    if (
      profile?.onboarding_completed &&
      pathname === APP_ROUTES.onboarding
    ) {
      const url = request.nextUrl.clone();
      url.pathname =
        !profile.profile_setup_completed && !profile.profile_setup_skipped
          ? APP_ROUTES.profileSetup
          : APP_ROUTES.dashboard;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
